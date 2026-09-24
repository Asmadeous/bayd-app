# A live-chat thread opened from the website's support bubble. Visitors need no
# account: the thread's unguessable token is their only credential (kept in their
# browser), so a thread is never looked up by email. A signed-in customer's
# thread is also linked to their user. Admins answer from the support inbox.
class SupportThread < ApplicationRecord
  belongs_to :user, optional: true
  has_many :messages, -> { order(:created_at) }, class_name: "SupportMessage", dependent: :destroy

  has_secure_token :token, length: 32

  enum :status, { open: "open", closed: "closed" }, default: "open"

  validates :name, presence: true, length: { maximum: 80 }
  validates :email, presence: true, format: { with: URI::MailTo::EMAIL_REGEXP }, length: { maximum: 254 }

  scope :newest_first, -> { order(Arel.sql("last_message_at DESC NULLS LAST, created_at DESC")) }

  # Adds a message and keeps the thread's activity + status current. A visitor
  # writing into a closed thread reopens it.
  def post!(body:, from_staff:, sender: nil)
    transaction do
      message = messages.create!(body: body, from_staff: from_staff, sender: sender)
      update!(last_message_at: message.created_at, status: from_staff ? status : "open")
      message
    end
  end

  def unread_for_staff = messages.where(from_staff: false, read_at: nil).count
  def unread_for_visitor = messages.where(from_staff: true, read_at: nil).count

  def mark_read_by_staff! = messages.where(from_staff: false, read_at: nil).update_all(read_at: Time.current)
  def mark_read_by_visitor! = messages.where(from_staff: true, read_at: nil).update_all(read_at: Time.current)
end
