class AddMethodToGiftCardTransactions < ActiveRecord::Migration[8.1]
  def change
    # How a top-up / issue was paid: card | cash | pos | online (nil for legacy).
    add_column :gift_card_transactions, :method, :string
  end
end
