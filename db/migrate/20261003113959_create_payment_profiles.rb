# A customer's card on file per franchise (each franchise has its own payment
# account, so a card saved in one can't be charged by another). Today's saved
# Square cards become the default franchise's profiles; the old users columns
# are left in place, unused, until a later cleanup.
class CreatePaymentProfiles < ActiveRecord::Migration[8.1]
  def up
    create_table :payment_profiles do |t|
      t.references :user, null: false, foreign_key: true
      t.references :franchise, null: false, foreign_key: true
      t.string :gateway, null: false
      t.string :customer_ref
      t.string :card_ref
      t.string :card_brand
      t.string :card_last4
      t.timestamps
    end
    add_index :payment_profiles, %i[user_id franchise_id gateway], unique: true

    execute <<~SQL
      INSERT INTO payment_profiles (user_id, franchise_id, gateway, customer_ref, card_ref, card_brand, card_last4, created_at, updated_at)
      SELECT users.id, franchises.id, 'square', users.square_customer_id, users.square_card_id, users.card_brand, users.card_last4, NOW(), NOW()
      FROM users CROSS JOIN franchises
      WHERE franchises.is_default AND (users.square_customer_id IS NOT NULL OR users.square_card_id IS NOT NULL)
    SQL
  end

  def down
    drop_table :payment_profiles
  end
end
