class PartnerSerializer < Blueprinter::Base
  identifier :id
  fields :name, :slug, :email, :phone, :status, :platform_fee_pct, :payout_notes, :created_at

  field :providers_count do |partner|
    partner.employee_profiles.size
  end

  field :covered_fsas do |partner|
    partner.covered_fsas
  end

  field :pending do |partner|
    partner.pending_earnings
  end
end
