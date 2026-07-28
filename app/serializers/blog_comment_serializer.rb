class BlogCommentSerializer < Blueprinter::Base
  identifier :id
  fields :body, :approved, :created_at

  field :author do |comment, _opts|
    comment.user ? "#{comment.user.first_name} #{comment.user.last_name}".strip : comment.author_name
  end
end
