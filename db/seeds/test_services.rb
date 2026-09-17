# Standalone, idempotent seeder for the two $1 QA test services. Run on EVERY
# deploy (see bin/docker-entrypoint) because it only upserts these two rows - it
# never runs the destructive catalog cleanup the full db/seeds.rb does, so it's
# safe against a populated production DB.
#
# Kept out of the main services_data list on purpose: the full seed deactivates
# any service not in its list, so these live only here and this file re-activates
# them. Remove this seeder (and the two services) before going fully public.

nails = ServiceCategory.find_or_create_by!(slug: "nails") { |c| c.name = "Nails"; c.position = 1 }

[
  { name: "pedicure-test", desc: "TEST SERVICE - $1 pedicure for QA. Not a real service; remove before public launch." },
  { name: "manicure-test", desc: "TEST SERVICE - $1 manicure for QA. Not a real service; remove before public launch." }
].each do |t|
  svc = Service.find_or_initialize_by(name: t[:name])
  svc.assign_attributes(
    service_category: nails,
    duration_minutes: 15,
    price:            1.00,
    description:      t[:desc],
    active:           true
  )
  svc.save!
end

puts "  #{Service.where(name: %w[pedicure-test manicure-test]).count} test services (pedicure-test, manicure-test @ $1)"
