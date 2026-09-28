class CreateChatSafety < ActiveRecord::Migration[8.1]
  def change
    create_table :user_blocks do |t|
      t.references :blocker, null: false, foreign_key: { to_table: :users }
      t.references :blocked, null: false, foreign_key: { to_table: :users }
      t.timestamps
    end
    add_index :user_blocks, %i[blocker_id blocked_id], unique: true

    create_table :chat_reports do |t|
      t.references :conversation, null: false, foreign_key: true
      t.references :reporter, null: false, foreign_key: { to_table: :users }
      t.references :reported_user, null: false, foreign_key: { to_table: :users }
      t.string :reason, null: false
      t.text :details
      t.string :status, null: false, default: "open"
      t.timestamps
    end
  end
end
