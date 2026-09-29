# A single chat message in a Conversation. The sender must be one of the two
# conversation participants. Creating a message bumps the conversation's
# last_message_at (for newest-first ordering) and broadcasts it live (2b channel).
# A message is text, a photo, or both; a photo-only message stores an empty body.
class Message < ApplicationRecord
  MAX_IMAGE_SIZE = 10.megabytes

  belongs_to :conversation
  belongs_to :sender, class_name: "User"
  has_one_attached :image

  validates :body, presence: true, unless: -> { image.attached? }
  validate  :sender_is_participant
  validate  :image_size

  before_validation :mask_objectionable_words
  after_create_commit :touch_conversation

  scope :chronological, -> { order(:created_at) }

  def read? = read_at.present?

  private

  def sender_is_participant
    return if conversation.nil? || sender.nil?

    errors.add(:sender, "must be a conversation participant") unless conversation.participant?(sender)
  end

  def image_size
    errors.add(:image, "must be smaller than 10 MB") if image.attached? && image.blob.byte_size > MAX_IMAGE_SIZE
  end

  def mask_objectionable_words
    self.body = ObjectionableContent.mask(body)
  end

  def touch_conversation
    conversation.update_column(:last_message_at, created_at)
  end
end
