class LoyaltyAccountSerializer < Blueprinter::Base
  identifier :id
  fields :points_balance

  association :loyalty_transactions, blueprint: LoyaltyTransactionSerializer
end
