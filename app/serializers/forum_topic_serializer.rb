class ForumTopicSerializer < Blueprinter::Base
  identifier :id
  fields :title, :slug, :pinned, :locked, :posts_count, :last_posted_at, :created_at

  field :author do |topic, _opts|
    "#{topic.user.first_name} #{topic.user.last_name}".strip
  end
end
