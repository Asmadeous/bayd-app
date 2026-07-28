class ForumCategory < ApplicationRecord
  has_many :forum_topics, dependent: :destroy

  validates :name, :slug, presence: true
  validates :slug, uniqueness: true

  default_scope { order(:position) }
end
