# One-time revert of the testing-only data that was applied to production
# (24/7 schedules + $1 test services). Runs on every deploy from the entrypoint
# but is idempotent: once schedules are 9-19 Mon-Sat and the test services are
# inactive, re-running does nothing. Only touches these specific rows - no
# destructive catalog cleanup. Safe to delete this file (and its entrypoint call)
# after the first deploy that runs it; left in place it stays a no-op.

# 1. Narrow every dispatchable tech's schedule back to the real window
#    (Mon-Sat 09:00-19:00) and drop any testing Sunday rows.
EmployeeProfile.where(active: true, dispatchable: true).find_each do |profile|
  AvailabilitySchedule.where(employee_profile: profile, day_of_week: 0).delete_all
  (1..6).each do |dow|
    sched = AvailabilitySchedule.find_or_initialize_by(employee_profile: profile, day_of_week: dow)
    next if sched.start_time&.strftime("%H:%M") == "09:00" && sched.end_time&.strftime("%H:%M") == "19:00"

    sched.start_time = "09:00"
    sched.end_time   = "19:00"
    sched.save!
  end
end

# 2. Deactivate the $1 QA test services so they stop showing to customers.
deactivated = Service.where(name: %w[pedicure-test manicure-test], active: true).update_all(active: false)

puts "  reverted testing data (schedules -> 9-19 Mon-Sat, deactivated #{deactivated} test service(s))"
