class PartnerPayoutSerializer < Blueprinter::Base
  identifier :id
  fields :booking_count, :gross, :fee_amount, :amount, :platform_fee_pct,
         :status, :paid_at, :notes, :created_at, :partner_id
end
