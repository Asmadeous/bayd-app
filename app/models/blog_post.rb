class BlogPost < ApplicationRecord
  belongs_to :author, class_name: "User", optional: true
  has_many :blog_comments, dependent: :destroy

  enum :status, { draft: "draft", published: "published", archived: "archived" }

  validates :title, :slug, presence: true
  validates :slug, uniqueness: true

  scope :published, -> { where(status: "published").order(published_at: :desc) }

  before_validation :generate_slug, if: -> { slug.blank? && title.present? }

  private

  def generate_slug
    self.slug = title.downcase.gsub(/[^a-z0-9]+/, "-").gsub(/\A-|-\z/, "")
  end
end
