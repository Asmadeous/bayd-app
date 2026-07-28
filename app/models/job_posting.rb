class JobPosting < ApplicationRecord
  has_many :job_applications, dependent: :nullify

  EMPLOYMENT_TYPES = %w[full_time part_time contract temporary internship].freeze

  enum :employment_type, EMPLOYMENT_TYPES.index_with(&:itself), prefix: true
  enum :status, { draft: "draft", published: "published", closed: "closed" }, prefix: true

  validates :title, presence: true
  validates :slug, presence: true, uniqueness: true
  validates :employment_type, inclusion: { in: EMPLOYMENT_TYPES }

  before_validation :generate_slug, if: -> { slug.blank? && title.present? }

  scope :published, -> { where(status: "published").order(posted_at: :desc, created_at: :desc) }
  scope :by_type,       ->(t) { where(employment_type: t) if t.present? }
  scope :by_department, ->(d) { where(department: d) if d.present? }
  scope :by_location,   ->(l) { where(location: l) if l.present? }

  private

  def generate_slug
    base = title.parameterize
    candidate = base
    i = 2
    while JobPosting.where(slug: candidate).where.not(id: id).exists?
      candidate = "#{base}-#{i}"
      i += 1
    end
    self.slug = candidate
  end
end
