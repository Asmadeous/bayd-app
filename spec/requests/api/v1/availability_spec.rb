require "rails_helper"

# Availability now comes from our own AvailabilityEngine (schedules − bookings −
# travel), not SimplyBook. `mapped` means "this tech performs the service".
RSpec.describe "GET /api/v1/availability", type: :request do
  let(:service)  { create(:service, duration_minutes: 60) }
  let(:employee) { create(:employee_profile, base_latitude: 43.65, base_longitude: -79.38) }
  let(:date_obj) { next_weekday(3) } # a Wednesday in the future
  let(:date)     { date_obj.to_s }

  def next_weekday(wday)
    d = Date.current + 1
    d += 1 until d.wday == wday
    d
  end

  # tech performs the service and has a 09:00-12:00 window that day
  def schedule!(ep = employee, start_time: "09:00", end_time: "12:00")
    EmployeeService.find_or_create_by!(service: service, employee_profile: ep)
    create(:availability_schedule, employee_profile: ep, day_of_week: date_obj.wday,
           start_time: start_time, end_time: end_time)
  end

  def get_availability(params)
    get "/api/v1/availability", params: params
    JSON.parse(response.body)
  end

  it "returns the tech's open slots computed from their schedule" do
    schedule!
    json = get_availability(service_id: service.id, employee_id: employee.id, date: date)

    expect(response).to have_http_status(:ok)
    expect(json["mapped"]).to be(true)
    expect(json["slots"]).to include("09:00", "11:00")
    expect(json["slots"]).not_to include("11:30") # 60-min visit would end 12:30
  end

  it "scales the visit for a group (count) — a party of 2 needs a longer window" do
    schedule!(start_time: "09:00", end_time: "11:00")
    json = get_availability(service_id: service.id, employee_id: employee.id, date: date, count: 2)
    # 60-min service × party 2 = 120 min → only 09:00 fits a 09:00-11:00 window.
    expect(json["slots"]).to eq([ "09:00" ])
  end

  it "reports mapped:false (empty slots) when the tech does not perform the service" do
    json = get_availability(service_id: service.id, employee_id: employee.id, date: date)
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
    EmployeeService.find_or_create_by!(service: service, employee_profile: employee)
    create(:availability_schedule, employee_profile: employee, day_of_week: date_obj.wday,
           start_time: "09:00", end_time: "13:00")
    # Existing job ends at 10:00 far from the customer → nearby-in-time slots
    # (10:00, 10:15...) unreachable; a slot hours later is fine.
    ten = BusinessHours.parse_local("#{date} 10:00")
    Booking.create!(employee_profile: employee, service: service, user: create(:user),
                    client_type: "adult", party_size: 1, status: "confirmed",
                    starts_at: ten - 60.minutes, ends_at: ten, subtotal: 10, travel_fee: 0, total: 10,
                    service_latitude: 43.95, service_longitude: -79.95)

    json = get_availability(
      service_id: service.id, employee_id: employee.id, date: date,
      latitude: 43.20, longitude: -79.00
    )
    expect(json["slots"]).not_to include("10:00", "10:15")
  end

  describe "GET /api/v1/availability/any (auto-shift across techs)" do
    let(:susi)   { create(:employee_profile, base_latitude: 43.6, base_longitude: -79.4, user: create(:user, first_name: "Susi")) }
    let(:claire) { create(:employee_profile, base_latitude: 43.6, base_longitude: -79.4, user: create(:user, first_name: "Claire")) }

    it "returns each tech's slots and a by_time map of who is free when" do
      EmployeeService.create!(service: service, employee_profile: susi)
      EmployeeService.create!(service: service, employee_profile: claire)
      # Susi 09:00-11:00 (slots 09:00,10:00); Claire 10:00-12:00 (slots 10:00,11:00).
      create(:availability_schedule, employee_profile: susi, day_of_week: date_obj.wday, start_time: "09:00", end_time: "11:00")
      create(:availability_schedule, employee_profile: claire, day_of_week: date_obj.wday, start_time: "10:00", end_time: "12:00")

      get "/api/v1/availability/any", params: { service_id: service.id, date: date }
      json = JSON.parse(response.body)

      expect(response).to have_http_status(:ok)
      expect(json["mapped"]).to be(true)
      expect(json["providers"].size).to eq(2)
      # 10:00 has BOTH free; 09:00 only Susi; 11:00 only Claire.
      expect(json["by_time"]["10:00"].map { |p| p["name"] }).to contain_exactly("Susi", "Claire")
      expect(json["by_time"]["09:00"].map { |p| p["name"] }).to eq([ "Susi" ])
      expect(json["by_time"]["11:00"].map { |p| p["name"] }).to eq([ "Claire" ])
    end

    it "reports mapped:false when the service has no techs" do
      lonely = create(:service)
      get "/api/v1/availability/any", params: { service_id: lonely.id, date: date }
      json = JSON.parse(response.body)
      expect(json["mapped"]).to be(false)
      expect(json["providers"]).to eq([])
    end

    it "suggests the next available date when the whole day has no schedule" do
      EmployeeService.create!(service: service, employee_profile: susi)
      # No schedule on `date` (a Wednesday); schedule the NEXT day (Thursday) so the
      # queried day is empty but a later date has an opening → next_available_date.
      later = date_obj + 1
      create(:availability_schedule, employee_profile: susi, day_of_week: later.wday, start_time: "09:00", end_time: "12:00")

      get "/api/v1/availability/any", params: { service_id: service.id, date: date }
      json = JSON.parse(response.body)

      expect(json["by_time"]).to eq({})
      expect(json["next_available_date"]).to eq(later.to_s)
    end
  end
end
