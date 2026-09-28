# A user reported the other person in a conversation. Admins are alerted and
# review it from the conversation (Apple guideline 1.2 asks for this).
class ChatReport < ApplicationRecord
  REASONS = [
    "Harassment or abuse",
    "Inappropriate or sexual content",
    "Spam or scam",
    "Something else"
  ].freeze

  belongs_to :conversation
  belongs_to :reporter, class_name: "User"
  belongs_to :reported_user, class_name: "User"

  enum :status, { open: "open", reviewed: "reviewed" }, prefix: true

  validates :reason, inclusion: { in: REASONS }
  validates :details, length: { maximum: 1000 }
end
