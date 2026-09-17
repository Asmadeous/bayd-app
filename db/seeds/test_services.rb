# Standalone, idempotent seeder for the two $1 QA test services. Run on EVERY
# deploy (see bin/docker-entrypoint) because it only upserts these two rows - it
# never runs the destructive catalog cleanup the full db/seeds.rb does, so it's
# safe against a populated production DB.
#
# Kept out of the main services_data list on purpose: the full seed deactivates
# any service not in its list, so these live only here and this file re-activates
# them. Remove this seeder (and the two services) before going fully public.

nails = ServiceCategory.find_or_create_by!(slug: "nails") { |c| c.name = "Nails"; c.position = 1 }

test_services = [
  { name: "pedicure-test", desc: "TEST SERVICE - $1 pedicure for QA. Not a real service; remove before public launch." },
  { name: "manicure-test", desc: "TEST SERVICE - $1 manicure for QA. Not a real service; remove before public launch." }
].map do |t|
  svc = Service.find_or_initialize_by(name: t[:name])
  svc.assign_attributes(
    service_category: nails,
    duration_minutes: 15,
    price:            1.00,
    description:      t[:desc],
    active:           true
  )
  svc.save!
  svc
end

# Link the test services only to techs who perform a REAL nails service (i.e.
# actually do pedicures/manicures) - not just any nails-category row, or the test
# services themselves would qualify a tech circularly. A lash-only or spa-only
# tech must never be offered for a pedicure. Also PRUNE the link from techs who
# no longer qualify, so a mis-link doesn't stick.
test_ids = test_services.map(&:id)
nails_techs = EmployeeProfile.where(active: true, dispatchable: true).select do |t|
  t.services.where(service_category_id: nails.id).where.not(id: test_ids).exists?
end
nails_techs.each do |tech|
  test_services.each { |svc| EmployeeService.find_or_create_by!(employee_profile: tech, service: svc) }
end

# Remove test-service links from any tech NOT in the qualified set.
keep_ids = nails_techs.map(&:id)
EmployeeService.where(service_id: test_ids).where.not(employee_profile_id: keep_ids).destroy_all

puts "  #{test_services.size} test services linked to #{nails_techs.size} nails techs: #{nails_techs.map { |t| t.user.first_name }.inspect}"
