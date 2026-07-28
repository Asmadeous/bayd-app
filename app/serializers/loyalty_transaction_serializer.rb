class LoyaltyTransactionSerializer < Blueprinter::Base
  identifier :id
  fields :points, :kind, :description, :created_at
end
