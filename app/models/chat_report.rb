# A user reported the other person in a conversation. Admins are alerted and
# review it from the conversation (Apple guideline 1.2 asks for this).
class ChatReport < ApplicationRecord
  include FranchiseScoped

  REASONS = [
    "Harassment or abuse",
    "Inappropriate or sexual content",
    "Spam or scam",
    "Something else"
  ].freeze

  belongs_to :conversation
  belongs_to :reporter, class_name: "User"
  belongs_to :reported_user, class_name: "User"
  belongs_to :reviewed_by, class_name: "User", optional: true

  enum :status, { open: "open", reviewed: "reviewed" }, prefix: true

  validates :reason, inclusion: { in: REASONS }
  validates :details, length: { maximum: 1000 }

  def mark_reviewed!(admin)
    update!(status: "reviewed", reviewed_by: admin, reviewed_at: Time.current)
  end

  def reopen!
    update!(status: "open", reviewed_by: nil, reviewed_at: nil)
  end
end
