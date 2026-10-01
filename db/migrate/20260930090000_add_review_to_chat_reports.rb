class AddReviewToChatReports < ActiveRecord::Migration[8.1]
  def change
    add_reference :chat_reports, :reviewed_by, foreign_key: { to_table: :users }
    add_column :chat_reports, :reviewed_at, :datetime
    add_index :chat_reports, :status
  end
end
