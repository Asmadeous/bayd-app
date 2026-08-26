# A 1:1 conversation between two users (customer↔staff, staff↔admin, etc.). The
# participant pair is normalized (participant_one holds the lower user id) so a
# given pair maps to exactly one conversation row — enforced by the unique index
# and the `between` builder.
class Conversation < ApplicationRecord
  belongs_to :participant_one, class_name: "User"
  belongs_to :participant_two, class_name: "User"
  has_many   :messages, dependent: :destroy

  validate :distinct_participants

  scope :for_user, lambda { |user|
    where(participant_one_id: user.id).or(where(participant_two_id: user.id))
  }
  scope :newest_first, -> { order(Arel.sql("last_message_at DESC NULLS LAST, created_at DESC")) }

  # Find or create the single conversation between two users, regardless of the
  # order they're passed. Normalizes the pair so (a,b) and (b,a) are one row.
  def self.between(user_a, user_b)
    one, two = [ user_a, user_b ].minmax_by(&:id)
    find_or_create_by!(participant_one: one, participant_two: two)
  end

  def participant?(user)
    user && (participant_one_id == user.id || participant_two_id == user.id)
  end

  def other_participant(user)
    participant_one_id == user.id ? participant_two : participant_one
  end

  # Unread messages for `user` = messages the OTHER person sent that user hasn't read.
  def unread_count_for(user)
    messages.where.not(sender_id: user.id).where(read_at: nil).count
  end

  private

  def distinct_participants
    errors.add(:participant_two, "must differ from participant one") if participant_one_id == participant_two_id
  end
end
