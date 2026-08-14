FactoryBot.define do
  factory :order do
    user
    status { "pending" }
    total  { 0 }
  end
end
