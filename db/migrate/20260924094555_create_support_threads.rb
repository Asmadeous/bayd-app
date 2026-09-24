class CreateSupportThreads < ActiveRecord::Migration[8.1]
  def change
    create_table :support_threads do |t|
      t.string :token, null: false
      t.string :name, null: false
      t.string :email, null: false
      t.references :user, foreign_key: true
      t.string :status, null: false, default: "open"
      t.datetime :last_message_at
      t.timestamps
    end
    add_index :support_threads, :token, unique: true
    add_index :support_threads, [ :status, :last_message_at ]

    create_table :support_messages do |t|
      t.references :support_thread, null: false, foreign_key: true
      t.references :sender, foreign_key: { to_table: :users }
      t.boolean :from_staff, null: false, default: false
      t.text :body, null: false
      t.datetime :read_at
      t.timestamps
    end
    add_index :support_messages, [ :support_thread_id, :created_at ]
  end
end
