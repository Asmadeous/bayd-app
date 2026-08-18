FactoryBot.define do
  factory :blog_post do
    sequence(:title) { |n| "Beauty tip ##{n}" }
    body { "Full post body." }
    excerpt { "Short teaser." }
    status { "draft" }
  end
end
