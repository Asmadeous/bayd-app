class CreateWebauthnChallenges < ActiveRecord::Migration[8.1]
  def change
    # This is a stateless JWT API (no cookie sessions), so the WebAuthn challenge
    # is stored server-side between options-request and verify, with a short TTL.
    create_table :webauthn_challenges do |t|
      t.references :user, null: false, foreign_key: true
      t.string   :challenge, null: false
      t.string   :purpose, null: false # "registration" | "authentication"
      t.datetime :expires_at, null: false

      t.timestamps
    end
  end
end
