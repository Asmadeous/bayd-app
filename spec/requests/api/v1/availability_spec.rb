require "rails_helper"

RSpec.describe "GET /api/v1/availability", type: :request do
  let(:service) { create(:service, simplybook_event_id: "10") }
  let(:employee) { create(:employee_profile, simplybook_unit_id: "20") }
  let(:date) { (Date.current + 3).to_s }

  def get_availability(params)
    get "/api/v1/availability", params: params
    JSON.parse(response.body)
  end

  it "returns the tech's open slots from SimplyBook when mapped" do
    allow(ENV).to receive(:[]).and_call_original
    allow(ENV).to receive(:[]).with("SIMPLYBOOK_COMPANY").and_return("baydspa")
    client = instance_double(SimplyBook::Client, available_slots: [ "10:00", "10:30", "11:00" ])
    allow(SimplyBook::Client).to receive(:new).and_return(client)

    json = get_availability(service_id: service.id, employee_id: employee.id, date: date)

    expect(response).to have_http_status(:ok)
    expect(json["mapped"]).to be(true)
    expect(json["slots"]).to eq([ "10:00", "10:30", "11:00" ])
    expect(client).to have_received(:available_slots).with(
      service_id: "10", provider_id: "20", date: Date.parse(date), count: 1
    )
  end

  it "passes the group party size as count so slots fit the whole group" do
    allow(ENV).to receive(:[]).and_call_original
    allow(ENV).to receive(:[]).with("SIMPLYBOOK_COMPANY").and_return("baydspa")
    client = instance_double(SimplyBook::Client, available_slots: [ "10:00" ])
    allow(SimplyBook::Client).to receive(:new).and_return(client)

    get_availability(service_id: service.id, employee_id: employee.id, date: date, count: 4)

    expect(client).to have_received(:available_slots).with(hash_including(count: 4))
  end

  it "reports mapped:false (empty slots) when the tech has no SimplyBook id" do
    unmapped = create(:employee_profile, simplybook_unit_id: nil)
    expect(SimplyBook::Client).not_to receive(:new)

    json = get_availability(service_id: service.id, employee_id: unmapped.id, date: date)

    expect(response).to have_http_status(:ok)
    expect(json["mapped"]).to be(false)
    expect(json["slots"]).to eq([])
  end

  it "400s on a missing/invalid date" do
    json = get_availability(service_id: service.id, employee_id: employee.id, date: "not-a-date")
    expect(response).to have_http_status(:bad_request)
    expect(json).to have_key("error")
  end

  it "is reachable without authentication" do
    get "/api/v1/availability", params: { service_id: service.id, employee_id: employee.id, date: date }
    expect(response).not_to have_http_status(:unauthorized)
  end

  it "filters out slots the tech can't travel to when customer coords are given" do
    allow(ENV).to receive(:[]).and_call_original
    allow(ENV).to receive(:[]).with("SIMPLYBOOK_COMPANY").and_return("baydspa")
    client = instance_double(SimplyBook::Client, available_slots: [ "12:00", "15:00" ])
    allow(SimplyBook::Client).to receive(:new).and_return(client)
    service.update!(duration_minutes: 90)

    # Existing job ends at 12:00 (LOCAL business time, same zone slots are parsed
    # in) far from the customer → 12:00 is unreachable, but 15:00 (3h later) is fine.
    noon = BusinessHours.parse_local("#{date} 12:00")
    Booking.create!(employee_profile: employee, service: service, user: create(:user),
                    client_type: "adult", party_size: 1, status: "confirmed",
                    starts_at: noon - 90.minutes, ends_at: noon, subtotal: 10, travel_fee: 0, total: 10,
                    service_latitude: 43.5885, service_longitude: -79.6439)

    json = get_availability(
      service_id: service.id, employee_id: employee.id, date: date,
      latitude: 43.5402, longitude: -79.6899
    )

    expect(json["slots"]).to eq([ "15:00" ]) # 12:00 dropped by travel filter
  end

  describe "GET /api/v1/availability/any (auto-shift across techs)" do
    let(:susi) { create(:employee_profile, simplybook_unit_id: "2", user: create(:user, first_name: "Susi")) }
    let(:claire) { create(:employee_profile, simplybook_unit_id: "3", user: create(:user, first_name: "Claire")) }

    before do
      EmployeeService.create!(service: service, employee_profile: susi)
      EmployeeService.create!(service: service, employee_profile: claire)
      allow(ENV).to receive(:[]).and_call_original
      allow(ENV).to receive(:[]).with("SIMPLYBOOK_COMPANY").and_return("baydspa")
    end

    it "returns each tech's slots and a by_time map of who is free when" do
      client = instance_double(SimplyBook::Client)
      allow(SimplyBook::Client).to receive(:new).and_return(client)
      allow(client).to receive(:available_slots).with(hash_including(provider_id: "2")).and_return([ "10:00", "11:00" ])
      allow(client).to receive(:available_slots).with(hash_including(provider_id: "3")).and_return([ "11:00", "12:00" ])

      get "/api/v1/availability/any", params: { service_id: service.id, date: date }
      json = JSON.parse(response.body)

      expect(response).to have_http_status(:ok)
      expect(json["mapped"]).to be(true)
      expect(json["providers"].size).to eq(2)
      # 11:00 has BOTH techs free; 10:00 only Susi; 12:00 only Claire.
      expect(json["by_time"]["11:00"].map { |p| p["name"] }).to contain_exactly("Susi", "Claire")
      expect(json["by_time"]["10:00"].map { |p| p["name"] }).to eq([ "Susi" ])
    end

    it "reports mapped:false when the service has no mapped techs" do
      lonely = create(:service, simplybook_event_id: nil)
      get "/api/v1/availability/any", params: { service_id: lonely.id, date: date }
      json = JSON.parse(response.body)
      expect(json["mapped"]).to be(false)
      expect(json["providers"]).to eq([])
    end

    it "suggests the next available date when the whole day is fully booked" do
      client = instance_double(SimplyBook::Client)
      allow(SimplyBook::Client).to receive(:new).and_return(client)
      allow(client).to receive(:available_slots).and_return([]) # nobody free today
      allow(client).to receive(:first_available_date).with(hash_including(provider_id: "2")).and_return("2026-09-01")
      allow(client).to receive(:first_available_date).with(hash_including(provider_id: "3")).and_return("2026-08-30")

      get "/api/v1/availability/any", params: { service_id: service.id, date: date }
      json = JSON.parse(response.body)

      expect(json["by_time"]).to eq({})
      # earliest across techs
      expect(json["next_available_date"]).to eq("2026-08-30")
    end
  end
end
