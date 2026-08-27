class User < ApplicationRecord
  has_secure_password validations: false
  has_one_attached :avatar

  # `partner` is an external business acting as a bookable provider: it behaves
  # like `employee` for login (password via staff_login) and access, but is
  # exempt from the company-domain email rule below (partners use their own
  # email). See EMPLOYEE_EMAIL_DOMAIN / employee_email_on_company_domain.
  enum :role, { customer: "customer", employee: "employee", admin: "admin", partner: "partner" }

  # Staff accounts are provisioned by an admin, never self-registered — locking
  # employee logins to the company domain closes off a phishing/impersonation
  # vector (a stray @gmail.com "employee" account) without restricting admin,
  # who may legitimately need a different real-world email.
  EMPLOYEE_EMAIL_DOMAIN = "@baydspa.ca".freeze

  has_one  :employee_profile, dependent: :destroy
  has_many :addresses, dependent: :destroy
  has_many :booking_requests, dependent: :destroy
  has_many :bookings, dependent: :destroy
  has_one  :loyalty_account, dependent: :destroy
  has_many :gift_cards, foreign_key: :purchaser_id, dependent: :nullify
  has_many :reviews, dependent: :nullify
  has_many :orders, dependent: :destroy
  has_many :callback_requests, dependent: :nullify
  has_many :blog_posts, foreign_key: :author_id, dependent: :nullify
  has_many :blog_comments, dependent: :nullify
  has_many :forum_topics, dependent: :destroy
  has_many :forum_posts, dependent: :destroy
  has_one  :newsletter_subscriber, dependent: :destroy
  has_many :notifications, dependent: :destroy
  has_many :sent_messages, class_name: "Message", foreign_key: :sender_id, dependent: :destroy
  has_many :device_tokens, dependent: :destroy
  has_many :webauthn_credentials, dependent: :destroy

  # Stable, opaque handle for WebAuthn (never the email). Set on create.
  before_create { self.webauthn_id ||= SecureRandom.uuid }
  has_many :invoices, dependent: :destroy
  has_many :subscriptions, dependent: :destroy
  has_many :magic_link_tokens, dependent: :destroy

  # Referrals — a user can be referred by one other user and refer many.
  belongs_to :referred_by, class_name: "User", optional: true
  has_many   :referrals, class_name: "User", foreign_key: :referred_by_id, dependent: :nullify

  # Email is required for staff (they log in with email + password via
  # staff_login and need magic-link/notification delivery), but a customer can
  # exist on phone alone — see ApplicationController#find_or_create_customer.
  validates :email, presence: true, uniqueness: { case_sensitive: false },
                    format: { with: URI::MailTo::EMAIL_REGEXP }, unless: -> { customer? }
  validates :email, uniqueness: { case_sensitive: false },
                    format: { with: URI::MailTo::EMAIL_REGEXP }, allow_nil: true, if: -> { customer? }
  validate :email_or_phone_present, if: :customer?
  validate :employee_email_on_company_domain, if: :employee?
  validates :role, presence: true
  # Password required on create for non-SSO users; optional on update
  # Passwordless by design: customers are identified by email (+ phone), created
  # from public booking/checkout and sign-in by email. No password required.
  # A minimum length is only enforced if a password is ever set.
  validates :password, length: { minimum: 8 }, allow_nil: true

  before_validation { email&.downcase! }
  before_create :assign_referral_code
  after_create :create_loyalty_account

  def card_on_file?
    square_card_id.present?
  end

  private

  def email_or_phone_present
    return if email.present? || phone.present?

    errors.add(:base, "Email or phone is required")
  end

  def employee_email_on_company_domain
    return if email.to_s.downcase.end_with?(EMPLOYEE_EMAIL_DOMAIN)

    errors.add(:email, "must be a #{EMPLOYEE_EMAIL_DOMAIN} address for staff accounts")
  end

  def assign_referral_code
    return if referral_code.present?

    loop do
      candidate = SecureRandom.alphanumeric(8).upcase
      break self.referral_code = candidate unless User.exists?(referral_code: candidate)
    end
  end
end
