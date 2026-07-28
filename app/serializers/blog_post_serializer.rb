class BlogPostSerializer < Blueprinter::Base
  identifier :id
  fields :title, :slug, :excerpt, :body, :cover_image_url, :published_at

  field :author_name do |post, _opts|
    post.author&.then { |u| "#{u.first_name} #{u.last_name}".strip }
  end

  field :read_time do |post, _opts|
    words = post.body.to_s.split.size
    mins = [(words / 200.0).ceil, 1].max
    "#{mins} min read"
  end
end
