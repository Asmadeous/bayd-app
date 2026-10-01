# App Review demo technician (staff app review). Safe to run any number of
# times: it only creates or updates this one account and keeps one sample job.
# The staff app's App Store review signs in as this tech. It is never active,
# auto-assigned or given service areas, so no real customer can see or book it;
# its only client is the customer-app demo account. The password is only set on
# first creation, so changing it later isn't undone by a deploy.
reviewer = User.find_or_initialize_by(email: "reviewer@baydspa.ca")
reviewer.password = "BaydStaffReview2026!" if reviewer.new_record?
reviewer.update!(first_name: "App", last_name: "Reviewer", role: :employee)
reviewer_profile = EmployeeProfile.find_or_initialize_by(user: reviewer)
reviewer_profile.update!(title: "Demo technician", active: false, dispatchable: false, on_shift: false, service_fsas: [])
reviewer_services = Service.where(name: %w[Manicure Pedicure]).to_a
reviewer_services.each { |svc| EmployeeService.find_or_create_by!(employee_profile: reviewer_profile, service: svc) }

# Keep one upcoming sample job for the reviewer: a Manicure for the demo
# customer about a week out, re-created once the last one is past or used.
demo_customer = User.find_by(email: "appreview@baydspa.ca")
manicure = reviewer_services.find { |svc| svc.name == "Manicure" }
if demo_customer && manicure &&
   !reviewer_profile.bookings.where(status: %w[pending confirmed]).where("starts_at > ?", 1.day.from_now).exists?
  day = BusinessHours.zone.today + 7.days
  day += 1.day while day.sunday?
  starts = BusinessHours.zone.local(day.year, day.month, day.day, 11, 0)
  Booking.create!(
    user: demo_customer, employee_profile: reviewer_profile, service: manicure,
    address: demo_customer.addresses.find_by(default: true) || demo_customer.addresses.first,
    status: "confirmed", starts_at: starts, ends_at: starts + manicure.duration_minutes.minutes,
    subtotal: manicure.price, travel_fee: 0, total: manicure.price
  )
end
puts "  App Review demo technician (reviewer@baydspa.ca)"
