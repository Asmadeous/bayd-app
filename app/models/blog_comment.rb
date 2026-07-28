class BlogComment < ApplicationRecord
  belongs_to :blog_post
  belongs_to :user, optional: true

  validates :body, presence: true
  validates :author_name, presence: true, unless: -> { user_id.present? }

  scope :approved, -> { where(approved: true) }
end
