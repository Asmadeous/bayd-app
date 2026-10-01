class CreateNewsletterCampaigns < ActiveRecord::Migration[8.1]
  def change
    create_table :newsletter_campaigns do |t|
      t.string :subject, null: false
      t.text :body, null: false
      t.references :sent_by, foreign_key: { to_table: :users }
      t.datetime :sent_at
      t.integer :recipients_count, null: false, default: 0
      t.timestamps
    end
  end
end
