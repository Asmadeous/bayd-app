class Order < ApplicationRecord
  belongs_to :user
  belongs_to :shipping_address, class_name: "Address", optional: true

  has_many :order_items, dependent: :destroy
  has_many :products, through: :order_items
  has_many :payments, as: :payable, dependent: :destroy
  has_one  :invoice, as: :invoiceable, dependent: :nullify

  enum :status, { pending: "pending", paid: "paid", shipped: "shipped", cancelled: "cancelled" }

  validates :total, numericality: { greater_than_or_equal_to: 0 }

  # Generate an invoice once the order is paid.
  after_update_commit :ensure_invoice, if: -> { saved_change_to_status? && (paid? || shipped?) }
  # Dispatch (shipping) email when the order ships.
  after_update_commit :on_shipped, if: -> { saved_change_to_status? && shipped? }

  def recalculate_total!
    update!(total: order_items.sum { |i| i.price * i.quantity })
  end

  # Idempotent, lock-serialized "mark paid" used by both the client confirm and
  # the payment webhook — whichever arrives first wins; the other is a no-op.
  # Records a Payment and flips status (which fires the invoice + confirmation).
  def mark_paid!(processor:, reference: nil, amount: nil)
    with_lock do
      return self if paid? || shipped?

      payments.create!(
        amount: amount || total, status: "paid", method: "card",
        processor: processor, processor_ref: reference, paid_at: Time.current
      )
      update!(status: "paid")
    end
    self
  end

  private

  def ensure_invoice
    Invoice.generate_for(self) unless invoice
  end

  def on_shipped
    update_column(:shipped_at, Time.current) unless shipped_at
    OrderMailer.dispatched(self).deliver_later
  end
end
