FactoryBot.define do
  factory :conversation do
    association :participant_one, factory: :user
    association :participant_two, factory: :user
  end

  factory :message do
    conversation
    association :sender, factory: :user
    body { "Hello there" }
  end
end
