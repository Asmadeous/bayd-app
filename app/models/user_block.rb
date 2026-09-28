# One user has blocked another in chat. Blocking is one-way to record, but
# messaging stops in both directions while it exists (Apple guideline 1.2).
class UserBlock < ApplicationRecord
  belongs_to :blocker, class_name: "User"
  belongs_to :blocked, class_name: "User"

  validates :blocked_id, uniqueness: { scope: :blocker_id }
  validate :not_self

  # Is either user blocking the other?
  def self.between?(user_a, user_b)
    where(blocker: user_a, blocked: user_b).or(where(blocker: user_b, blocked: user_a)).exists?
  end

  private

  def not_self
    errors.add(:blocked, "can't be yourself") if blocker_id == blocked_id
  end
end
