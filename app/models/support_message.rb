class SupportMessage < ApplicationRecord
  MAX_LENGTH = 2000

  belongs_to :support_thread
  belongs_to :sender, class_name: "User", optional: true

  validates :body, presence: true, length: { maximum: MAX_LENGTH }
end
