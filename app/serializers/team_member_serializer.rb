class TeamMemberSerializer < Blueprinter::Base
  identifier :id
  fields :title, :bio, :years_experience

  field :photo_url do |ep|
    case ep.user&.first_name.to_s.downcase
    when "claire"
      "/images/new-pics-for-the-ladies/claire-team-profile.webp"
    else
      ep.photo_url
    end
  end

  field :name do |ep|
    ep.user&.first_name.presence || "Team Member"
  end

  field :average_rating do |ep|
    ep.reviews.approved.average(:rating)&.to_f&.round(1)
  end

  field :reviews_count do |ep|
    ep.reviews.approved.count
  end

  # Detailed view used on the individual staff page — includes the full
  # list of approved reviews (featured first) and the services they perform.
  view :detail do
    field :reviews do |ep|
      PublicReviewSerializer.render_as_hash(
        ep.reviews.approved.includes(:user).order(featured: :desc, created_at: :desc)
      )
    end

    field :services do |ep|
      ServiceSerializer.render_as_hash(ep.services.where(active: true))
    end
  end
end
