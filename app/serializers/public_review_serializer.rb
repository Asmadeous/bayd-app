class PublicReviewSerializer < Blueprinter::Base
  identifier :id
  fields :rating, :body, :featured, :created_at

  # Privacy: show first name + last initial only.
  field :reviewer_name do |review|
    first = review.user&.first_name.to_s.strip
    last_initial = review.user&.last_name.to_s.strip.first
    [ first, (last_initial ? "#{last_initial}." : nil) ].compact.join(" ").presence || "Anonymous"
  end
end
