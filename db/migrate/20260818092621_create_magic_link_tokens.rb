class CreateMagicLinkTokens < ActiveRecord::Migration[8.1]
  def change
    create_table :magic_link_tokens do |t|
      t.references :user, null: false, foreign_key: true
      # SHA-256 of the raw token we email — never store the usable token itself,
      # same principle as a password digest.
      t.string :token_digest, null: false
      t.datetime :expires_at, null: false
      t.datetime :used_at

      t.timestamps
    end

    add_index :magic_link_tokens, :token_digest, unique: true
  end
end
