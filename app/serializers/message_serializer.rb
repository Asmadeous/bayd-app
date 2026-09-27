class MessageSerializer < Blueprinter::Base
  identifier :id
  fields :conversation_id, :sender_id, :body, :read_at, :created_at

  field :image_url do |message|
    Rails.application.routes.url_helpers.rails_blob_url(message.image) if message.image.attached?
  end
end
