class FranchiseInquiry < ApplicationRecord
  # `unread` key maps to DB value "new" — see ContactMessage for why `new` can't be a key.
  enum :status, { unread: "new", contacted: "contacted", closed: "closed" }

  validates :email, format: { with: URI::MailTo::EMAIL_REGEXP }, allow_blank: true
end
