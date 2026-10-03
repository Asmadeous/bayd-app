# What a franchise owes the brand for one month: its royalty percentage of the
# money it actually took (payments received, less refunds), in its currency.
class RoyaltyStatement < ApplicationRecord
  include FranchiseScoped

  enum :status, { open: "open", paid: "paid" }, prefix: true

  validates :period_start, :period_end, :currency, presence: true

  def mark_paid! = update!(status: "paid", paid_at: Time.current)
end
