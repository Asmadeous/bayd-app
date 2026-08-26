class SyncEvent < ApplicationRecord
  enum :provider, { traccar: "traccar", helcim: "helcim", square: "square" }

  validates :provider, :event_type, :payload, presence: true

  scope :unprocessed, -> { where(processed_at: nil) }

  def processed?
    processed_at.present?
  end

  def mark_processed!
    update!(processed_at: Time.current)
  end
end
