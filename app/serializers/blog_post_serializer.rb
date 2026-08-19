class BlogPostSerializer < Blueprinter::Base
  identifier :id
  fields :title, :slug, :excerpt, :body, :published_at, :category

  # Prefers a real uploaded cover image; falls back to the plain URL string.
  field :cover_image_url do |post|
    if post.cover_image.attached?
      Rails.application.routes.url_helpers.rails_blob_url(post.cover_image)
    else
      post.cover_image_url
    end
  end

  field :author_name do |post, _opts|
    post.author&.then { |u| "#{u.first_name} #{u.last_name}".strip }
  end

  field :read_time do |post, _opts|
    words = post.body.to_s.split.size
    mins = [ (words / 200.0).ceil, 1 ].max
    "#{mins} min read"
  end
end
