class PartnerPayout < ApplicationRecord
  belongs_to :partner
  has_many :bookings, dependent: :nullify

  enum :status, { pending: "pending", paid: "paid" }, prefix: true

  scope :recent, -> { order(created_at: :desc) }

  def mark_paid!(notes: nil)
    update!(status: "paid", paid_at: Time.current, notes: notes.presence || self.notes)
  end
end
