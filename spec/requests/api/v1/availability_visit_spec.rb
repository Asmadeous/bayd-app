require "rails_helper"

RSpec.describe "GET /api/v1/availability/visit", type: :request do
  let(:date) { next_weekday(3) }
  let(:lash) { create(:service, name: "Lash Lift", duration_minutes: 60) }
  let(:pedi) { create(:service, name: "Pedicure", duration_minutes: 60) }

  def next_weekday(wday)
    d = Date.current + 1
    d += 1 until d.wday == wday
    d
  end

  def tech(*services, name:, from: "09:00", to: "12:00", day: date)
    ep = create(:employee_profile, user: create(:user, first_name: name), dispatchable: true,
                base_latitude: 43.66, base_longitude: -79.39)
    services.each { |s| EmployeeService.create!(employee_profile: ep, service: s) }
    create(:availability_schedule, employee_profile: ep, day_of_week: day.wday, start_time: from, end_time: to)
    ep
  end

  def get_visit(params)
    get "/api/v1/availability/visit", params: params
    JSON.parse(response.body)
  end

  it "returns combined times with the tech for each service" do
    dana = tech(lash, name: "Dana")
    susi = tech(pedi, name: "Susi")

    body = get_visit(service_ids: [ lash.id, pedi.id ], date: date.to_s, latitude: 43.65, longitude: -79.38)

    expect(response).to have_http_status(:ok)
    slot = body["by_time"]["09:15"]
    expect(slot["single_tech"]).to be(false)
    expect(slot["lines"].map { |l| [ l["service_name"], l["employee_id"], l["name"], l["start_time"], l["end_time"] ] })
      .to eq([ [ "Lash Lift", dana.id, "Dana", "09:15", "10:15" ], [ "Pedicure", susi.id, "Susi", "10:15", "11:15" ] ])
    expect(body["next_available_date"]).to be_nil
  end

  it "suggests the next date when the day can't be staffed" do
    tech(lash, pedi, name: "Dana", day: date + 1)

    body = get_visit(service_ids: [ lash.id, pedi.id ], date: date.to_s)
    expect(body["by_time"]).to eq({})
    expect(body["next_available_date"]).to eq((date + 1).to_s)
  end

  it "rejects missing or inactive services and bad dates" do
    get_visit(service_ids: [ lash.id ], date: "nope")
    expect(response).to have_http_status(:bad_request)

    pedi.update!(active: false)
    get_visit(service_ids: [ lash.id, pedi.id ], date: date.to_s)
    expect(response).to have_http_status(:bad_request)

    get_visit(date: date.to_s)
    expect(response).to have_http_status(:bad_request)
  end
end

RSpec.describe "GET /api/v1/availability/visit while rescheduling", type: :request do
  let(:date) { d = Date.current + 1; d += 1 until d.wday == 3; d }
  let(:customer) { create(:user) }
  let(:svc) { create(:service, duration_minutes: 60) }
  let!(:tech) do
    ep = create(:employee_profile, dispatchable: true)
    EmployeeService.create!(employee_profile: ep, service: svc)
    create(:availability_schedule, employee_profile: ep, day_of_week: date.wday, start_time: "09:00", end_time: "10:30")
    ep
  end
  let!(:visit) do
    v = create(:visit, user: customer)
    create(:booking, visit: v, user: customer, employee_profile: tech, service: svc,
                     starts_at: BusinessHours.zone.parse("#{date} 09:15"), ends_at: BusinessHours.zone.parse("#{date} 10:15"))
    v
  end

  def token(u) = JWT.encode({ sub: u.id, exp: 1.day.from_now.to_i }, ENV["SECRET_KEY_BASE"].presence || Rails.application.secret_key_base, "HS256")

  it "ignores the signed-in customer's own visit, and nobody else's" do
    get "/api/v1/availability/visit", params: { service_ids: [ svc.id ], date: date.to_s, visit_id: visit.id }
    expect(JSON.parse(response.body)["by_time"]).to eq({})

    get "/api/v1/availability/visit", params: { service_ids: [ svc.id ], date: date.to_s, visit_id: visit.id },
                                      headers: { "Authorization" => "Bearer #{token(create(:user))}" }
    expect(JSON.parse(response.body)["by_time"]).to eq({})

    get "/api/v1/availability/visit", params: { service_ids: [ svc.id ], date: date.to_s, visit_id: visit.id },
                                      headers: { "Authorization" => "Bearer #{token(customer)}" }
    expect(JSON.parse(response.body)["by_time"].keys).to eq([ "09:15" ])
  end
end
