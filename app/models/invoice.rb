class Invoice < ApplicationRecord
  HST_RATE = 0.13

  belongs_to :user
  belongs_to :invoiceable, polymorphic: true, optional: true
  has_one_attached :pdf

  enum :status, { issued: "issued", paid: "paid", void: "void", refunded: "refunded" }, prefix: true
  enum :kind, { booking: "booking", order: "order", gift_card: "gift_card", manual: "manual" }, prefix: true

  validates :total, :subtotal, :tax, numericality: { greater_than_or_equal_to: 0 }

  before_create { self.invoice_number ||= "TMP-#{SecureRandom.hex(8)}" }
  before_create { self.issued_at ||= Time.current }
  after_create_commit :assign_number, if: -> { invoice_number.start_with?("TMP-") }

  scope :recent, -> { order(issued_at: :desc, created_at: :desc) }

  def pdf_ready? = pdf.attached?

  # Build (idempotently) an invoice + PDF + email for a source record.
  # Queries by invoiceable (not the cached association) to avoid duplicates.
  def self.generate_for(source)
    existing = find_by(invoiceable: source)
    return existing if existing

    invoice = InvoiceBuilder.new(source).build
    return unless invoice&.persisted?

    GenerateInvoiceJob.perform_later(invoice.id)
    invoice
  rescue ActiveRecord::RecordNotUnique
    # A concurrent call already created it — return that one (DB unique index).
    find_by(invoiceable: source)
  end

  private

  def assign_number
    update_column(:invoice_number, format("INV-%<year>d-%<seq>06d", year: created_at.year, seq: id))
  end
end
