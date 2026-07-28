class ForumTopic < ApplicationRecord
  belongs_to :forum_category
  belongs_to :user
  has_many :forum_posts, dependent: :destroy

  validates :title, :slug, presence: true
  validates :slug, uniqueness: true

  scope :pinned_first, -> { order(pinned: :desc, last_posted_at: :desc) }

  before_validation :generate_slug, if: -> { slug.blank? && title.present? }

  private

  def generate_slug
    self.slug = title.downcase.gsub(/[^a-z0-9]+/, "-").gsub(/\A-|-\z/, "")
  end
end
