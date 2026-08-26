FactoryBot.define do
  factory :device_token do
    user
    sequence(:token) { |n| "fcm-token-#{n}" }
    platform { "android" }
  end
end
