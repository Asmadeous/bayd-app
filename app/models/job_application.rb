class JobApplication < ApplicationRecord
  MAX_DOC_BYTES   = 5.megabytes
  ALLOWED_TYPES   = %w[application/pdf].freeze
  MAX_DOCUMENTS   = 3

  belongs_to :job_posting, optional: true
  has_many_attached :documents

  # `unread` key maps to DB value "new" — see ContactMessage for why `new` can't be a key.
  enum :status, { unread: "new", reviewing: "reviewing", rejected: "rejected", hired: "hired" }
  # Documents stay quarantined until ClamAV clears them.
  enum :scan_status, { pending: "pending", clean: "clean", infected: "infected" }, prefix: :scan

  validates :name, :email, presence: true
  validates :email, format: { with: URI::MailTo::EMAIL_REGEXP }
  validate :documents_are_safe

  # Downloads are only allowed once every attached doc has passed scanning.
  def documents_downloadable?
    scan_clean? && documents.attached?
  end

  private

  def documents_are_safe
    return unless documents.attached?

    if documents.size > MAX_DOCUMENTS
      errors.add(:documents, "cannot exceed #{MAX_DOCUMENTS} files")
    end

    documents.each do |doc|
      errors.add(:documents, "must be a PDF") unless ALLOWED_TYPES.include?(doc.blob.content_type)
      errors.add(:documents, "must be under #{MAX_DOC_BYTES / 1.megabyte} MB") if doc.blob.byte_size > MAX_DOC_BYTES
    end
  end
end
