class ForumPost < ApplicationRecord
  belongs_to :forum_topic, counter_cache: :posts_count
  belongs_to :user

  validates :body, presence: true

  after_create  { forum_topic.update!(last_posted_at: created_at) }

  scope :approved, -> { where(approved: true) }
end
