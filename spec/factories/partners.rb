FactoryBot.define do
  factory :partner do
    sequence(:name) { |n| "Partner Studio #{n}" }
    sequence(:email) { |n| "partner#{n}@external-biz.com" }
    phone { "+15550002222" }
    platform_fee_pct { 20 }
    status { "active" }
  end
end
