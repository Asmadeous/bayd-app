# A single chat message in a Conversation. The sender must be one of the two
# conversation participants. Creating a message bumps the conversation's
# last_message_at (for newest-first ordering) and broadcasts it live (2b channel).
class Message < ApplicationRecord
  belongs_to :conversation
  belongs_to :sender, class_name: "User"

  validates :body, presence: true
  validate  :sender_is_participant

  after_create_commit :touch_conversation

  scope :chronological, -> { order(:created_at) }

  def read? = read_at.present?

  private

  def sender_is_participant
    return if conversation.nil? || sender.nil?

    errors.add(:sender, "must be a conversation participant") unless conversation.participant?(sender)
  end

  def touch_conversation
    conversation.update_column(:last_message_at, created_at)
  end
end
