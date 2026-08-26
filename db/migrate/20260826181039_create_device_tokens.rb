class CreateDeviceTokens < ActiveRecord::Migration[8.1]
  def change
    create_table :device_tokens do |t|
      t.references :user, null: false, foreign_key: true
      # The FCM registration token for one app install, and its platform. A token
      # is globally unique to one install; registering an existing token re-points
      # it to the current user (a shared device that switches accounts).
      t.string :token, null: false
      t.string :platform, null: false, default: "android"

      t.timestamps
    end

    add_index :device_tokens, :token, unique: true
  end
end
