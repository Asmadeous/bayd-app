require "rails_helper"

RSpec.describe Visit, "reschedule and cancel" do
  let(:zone) { BusinessHours.zone }
  let(:date) { next_weekday(3) }
  let(:customer) { create(:user, first_name: "Ada") }
  let(:lash) { create(:service, name: "Lash Lift", duration_minutes: 60) }
  let(:pedi) { create(:service, name: "Pedicure", duration_minutes: 60) }
  let(:address) do
    customer.addresses.create!(line1: "1 King St W", city: "Toronto", province: "ON", postal_code: "M5V 2T6",
                               latitude: 43.65, longitude: -79.38)
  end

  before { allow_any_instance_of(Address).to receive(:geocode) }

  def next_weekday(wday)
    d = Date.current + 1
    d += 1 until d.wday == wday
    d
  end

  def at(hhmm) = zone.parse("#{date.iso8601} #{hhmm}")

  def tech(*services, name:)
    ep = create(:employee_profile, user: create(:user, first_name: name), dispatchable: true,
                base_latitude: 43.66, base_longitude: -79.39)
    services.each { |s| EmployeeService.create!(employee_profile: ep, service: s) }
    create(:availability_schedule, employee_profile: ep, day_of_week: date.wday, start_time: "09:00", end_time: "17:00")
    ep
  end

  def book_visit(start = "09:15")
    VisitBooker.new(user: customer, services: [ lash, pedi ], starts_at: at(start), address: address).call.visit
  end

  def windows(visit) = visit.reload.bookings.map { |b| [ b.employee_profile.user.first_name, b.starts_at.in_time_zone(zone).strftime("%H:%M") ] }

  describe "#reschedule!" do
    it "moves every line together, back-to-back" do
      tech(lash, name: "Dana")
      tech(pedi, name: "Susi")
      visit = book_visit

      visit.reschedule!(new_start: at("13:15"), by_customer: true)

      expect(windows(visit)).to eq([ [ "Dana", "13:15" ], [ "Susi", "14:15" ] ])
      expect([ visit.starts_at, visit.ends_at ]).to eq([ at("13:15"), at("15:15") ])
      expect(visit.bookings.map(&:reschedule_count)).to eq([ 1, 1 ])
    end

    it "shifts a single-tech visit by less than its length without tripping its own lines" do
      tech(lash, pedi, name: "Dana")
      visit = book_visit

      visit.reschedule!(new_start: at("09:45"))
      expect(windows(visit)).to eq([ [ "Dana", "09:45" ], [ "Dana", "10:45" ] ])
    end

    it "re-plans techs when the original one is busy at the new time" do
      dana = tech(lash, name: "Dana")
      tech(lash, name: "Lia")
      tech(pedi, name: "Susi")
      visit = book_visit
      create(:booking, employee_profile: dana, starts_at: at("13:00"), ends_at: at("14:30"))

      visit.reschedule!(new_start: at("13:15"))
      expect(windows(visit).first).to eq([ "Lia", "13:15" ])
      expect(dana.user.notifications.where(title: "Booking moved to another technician").count).to eq(1)
    end

    it "keeps techs when asked, and refuses if one can't make it" do
      dana = tech(lash, name: "Dana")
      tech(lash, name: "Lia")
      tech(pedi, name: "Susi")
      visit = book_visit
      create(:booking, employee_profile: dana, starts_at: at("13:00"), ends_at: at("14:30"))

      expect { visit.reschedule!(new_start: at("13:15"), keep_techs: true) }
        .to raise_error(Booking::RescheduleError) { |e| expect(e.reason).to eq(:slot_taken) }
      expect(windows(visit).first).to eq([ "Dana", "09:15" ])
    end

    it "refuses closed hours and visits already underway" do
      tech(lash, pedi, name: "Dana")
      visit = book_visit
      expect { visit.reschedule!(new_start: at("18:30")) }
        .to raise_error(Booking::RescheduleError) { |e| expect(e.reason).to eq(:outside_hours) }

      visit.bookings.first.update_columns(status: "in_progress")
      expect { visit.reload.reschedule!(new_start: at("13:15")) }
        .to raise_error(Booking::RescheduleError) { |e| expect(e.reason).to eq(:not_reschedulable) }
    end

    it "tells the customer once, naming both techs" do
      tech(lash, name: "Dana")
      tech(pedi, name: "Susi")
      visit = book_visit
      visit.reschedule!(new_start: at("13:15"))

      notes = customer.notifications.where(kind: "booking_rescheduled")
      expect(notes.count).to eq(1)
      expect(notes.first.body).to include("Lash Lift + Pedicure is now").and include("with Dana and Susi")
    end
  end

  describe "#cancel!" do
    it "cancels every live line and tells the customer once" do
      tech(lash, name: "Dana")
      tech(pedi, name: "Susi")
      visit = book_visit

      expect { visit.cancel!(reason: "Plans changed") }
        .to have_enqueued_job(BookingCancelledJob).with(visit.bookings.first.id, false)
        .and have_enqueued_job(BookingCancelledJob).with(visit.bookings.last.id, false)
      expect(visit.reload.status).to eq("cancelled")
      expect(customer.notifications.where(kind: "booking_cancelled").count).to eq(1)
      expect(customer.notifications.find_by(kind: "booking_cancelled").body).to start_with("Your Lash Lift + Pedicure on")
    end
  end
end
