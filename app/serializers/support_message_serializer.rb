class SupportMessageSerializer < Blueprinter::Base
  identifier :id
  fields :body, :from_staff, :created_at

  # Staff replies show who answered (first name only); visitor messages don't need it.
  field :sender_name do |message|
    message.sender&.first_name if message.from_staff
  end
end
