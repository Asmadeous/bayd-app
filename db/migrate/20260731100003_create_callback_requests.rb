class CreateCallbackRequests < ActiveRecord::Migration[8.1]
  def change
    create_table :callback_requests do |t|
      # The customer who tried to book out of area (nullable for guest enquiries).
      t.references :user, null: true, foreign_key: true
      t.references :service, null: true, foreign_key: true
      t.string  :postal_code
      t.string  :contact_name
      t.string  :contact_phone
      t.text    :notes
      t.string  :status, null: false, default: "new"   # new | contacted | booked | declined
      t.timestamps
    end
    add_index :callback_requests, :status
  end
end
