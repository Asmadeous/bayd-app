class AddPurposeToMagicLinkTokens < ActiveRecord::Migration[8.1]
  def change
    # "sign_in" or "password_reset" — kept distinct so a sign-in link can never
    # be replayed to change a password, and vice versa.
    add_column :magic_link_tokens, :purpose, :string, null: false, default: "sign_in"
  end
end
