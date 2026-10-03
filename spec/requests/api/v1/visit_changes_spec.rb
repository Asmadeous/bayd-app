require "rails_helper"

RSpec.describe "Visit reschedule and cancel", type: :request do
  let(:zone) { BusinessHours.zone }
  let(:date) { next_weekday(3) }
  let(:customer) { create(:user, first_name: "Ada", email: "ada@example.com") }
  let(:admin) { create(:user, email: "boss@baydspa.ca", role: :admin) }
  let(:lash) { create(:service, name: "Lash Lift", duration_minutes: 60) }
  let(:pedi) { create(:service, name: "Pedicure", duration_minutes: 60) }
  let(:address) do
    customer.addresses.create!(line1: "1 King St W", city: "Toronto", province: "ON", postal_code: "M5V 2T6",
                               latitude: 43.65, longitude: -79.38)
  end

  before { allow_any_instance_of(Address).to receive(:geocode) }

  def next_weekday(wday)
    d = Date.current + 3
    d += 1 until d.wday == wday
    d
  end

  def at(hhmm) = zone.parse("#{date.iso8601} #{hhmm}")

  def tech(*services, name:)
    user = create(:user, first_name: name, email: "#{name.downcase}@baydspa.ca", role: :employee)
    ep = create(:employee_profile, user: user, dispatchable: true, base_latitude: 43.66, base_longitude: -79.39)
    services.each { |s| EmployeeService.create!(employee_profile: ep, service: s) }
    create(:availability_schedule, employee_profile: ep, day_of_week: date.wday, start_time: "09:00", end_time: "17:00")
    ep
  end

  def book_visit = VisitBooker.new(user: customer, services: [ lash, pedi ], starts_at: at("09:15"), address: address).call.visit

  def token(u)
    JWT.encode({ sub: u.id, role: u.role, exp: 30.days.from_now.to_i },
               ENV["SECRET_KEY_BASE"].presence || Rails.application.secret_key_base, "HS256")
  end
  def auth(u) = { "Authorization" => "Bearer #{token(u)}" }
  def json = JSON.parse(response.body)
  def local(iso) = Time.zone.parse(iso).in_time_zone(zone).strftime("%H:%M")

  describe "customer" do
    it "reschedules the whole visit" do
      tech(lash, name: "Dana")
      tech(pedi, name: "Susi")
      visit = book_visit

      post "/api/v1/visits/#{visit.id}/reschedule", params: { starts_at: "#{date.iso8601}T13:15:00" }, headers: auth(customer)

      expect(response).to have_http_status(:ok)
      expect(json["lines"].map { |l| local(l["starts_at"]) }).to eq(%w[13:15 14:15])
    end

    it "moves the whole visit when an old app reschedules one line" do
      tech(lash, name: "Dana")
      tech(pedi, name: "Susi")
      visit = book_visit
      second = visit.bookings.last

      post "/api/v1/bookings/#{second.id}/reschedule", params: { starts_at: "#{date.iso8601}T14:15:00" }, headers: auth(customer)

      expect(response).to have_http_status(:ok)
      expect(visit.reload.bookings.map { |b| b.starts_at.in_time_zone(zone).strftime("%H:%M") }).to eq(%w[13:15 14:15])
    end

    it "cancels the whole visit" do
      tech(lash, pedi, name: "Dana")
      visit = book_visit

      post "/api/v1/visits/#{visit.id}/cancel", params: { reason: "Plans changed" }, headers: auth(customer)

      expect(response).to have_http_status(:ok)
      expect(json["status"]).to eq("cancelled")
    end

    it "can't touch someone else's visit" do
      tech(lash, pedi, name: "Dana")
      visit = book_visit
      post "/api/v1/visits/#{visit.id}/cancel", headers: auth(create(:user))
      expect(response).to have_http_status(:not_found)
    end
  end

  describe "staff" do
    it "can't move a visit shared with another tech" do
      dana = tech(lash, name: "Dana")
      tech(pedi, name: "Susi")
      visit = book_visit

      post "/api/v1/employee/bookings/#{visit.bookings.first.id}/reschedule",
           params: { starts_at: "#{date.iso8601}T13:15:00" }, headers: auth(dana.user)

      expect(response).to have_http_status(:unprocessable_content)
      expect(json["error"]).to include("shared with Susi (Pedicure)")
    end

    it "moves an all-theirs visit together, keeping every line" do
      dana = tech(lash, pedi, name: "Dana")
      visit = book_visit

      post "/api/v1/employee/bookings/#{visit.bookings.last.id}/reschedule",
           params: { starts_at: "#{date.iso8601}T14:15:00" }, headers: auth(dana.user)

      expect(response).to have_http_status(:ok)
      expect(visit.reload.bookings.map { |b| [ b.employee_profile_id, b.starts_at.in_time_zone(zone).strftime("%H:%M") ] })
        .to eq([ [ dana.id, "13:15" ], [ dana.id, "14:15" ] ])
    end
  end

  describe "admin" do
    it "moves a visit keeping its techs, and cancels it" do
      dana = tech(lash, name: "Dana")
      susi = tech(pedi, name: "Susi")
      visit = book_visit

      post "/api/v1/admin/visits/#{visit.id}/reschedule",
           params: { starts_at: "#{date.iso8601}T11:15:00", keep_techs: true }, headers: auth(admin)
      expect(response).to have_http_status(:ok)
      expect(visit.reload.bookings.map(&:employee_profile_id)).to eq([ dana.id, susi.id ])

      post "/api/v1/admin/visits/#{visit.id}/cancel", headers: auth(admin)
      expect(json["status"]).to eq("cancelled")
    end

    it "is admin only" do
      tech(lash, pedi, name: "Dana")
      visit = book_visit
      post "/api/v1/admin/visits/#{visit.id}/cancel", headers: auth(customer)
      expect(response).to have_http_status(:forbidden)
    end
  end
end
