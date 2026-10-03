FactoryBot.define do
  factory :franchise do
    sequence(:name) { |n| "Branch #{n}" }
    sequence(:slug) { |n| "branch-#{n}" }
    status { "live" }
    country_code { "GB" }
    currency { "GBP" }
    locale { "en-GB" }
    time_zone { "Europe/London" }
    tax_name { "VAT" }
    tax_rate { 0.20 }
    staff_email_domain { "bayd.co.uk" }
  end
end
