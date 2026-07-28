class ForumPostSerializer < Blueprinter::Base
  identifier :id
  fields :body, :created_at

  field :author do |post, _opts|
    "#{post.user.first_name} #{post.user.last_name}".strip
  end
end
