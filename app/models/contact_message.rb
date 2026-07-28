class ContactMessage < ApplicationRecord
  # NB: Ruby key is `unread` (not `new`) — an enum key of `new` collides with
  # ActiveRecord's `.new` class method. The stored DB value stays "new".
  enum :status, { unread: "new", read: "read", replied: "replied" }

  validates :name, :email, :message, presence: true
  validates :email, format: { with: URI::MailTo::EMAIL_REGEXP }
end
