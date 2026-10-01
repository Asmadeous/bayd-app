namespace :demo do
  desc "Create or update the App Review demo technician (reviewer@baydspa.ca) and its sample job"
  task app_review_staff: :environment do
    load Rails.root.join("db/seeds/app_review_staff.rb")
  end
end
