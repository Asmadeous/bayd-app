class CreateConversations < ActiveRecord::Migration[8.1]
  def change
    create_table :conversations do |t|
      # A 1:1 conversation between two users. The pair is stored normalized (lower
      # user id in participant_one) so (A,B) and (B,A) map to exactly one row.
      t.references :participant_one, null: false, foreign_key: { to_table: :users }
      t.references :participant_two, null: false, foreign_key: { to_table: :users }
      t.datetime   :last_message_at

      t.timestamps
    end

    add_index :conversations, [ :participant_one_id, :participant_two_id ], unique: true
  end
end
