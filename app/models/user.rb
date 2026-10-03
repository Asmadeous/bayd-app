class User < ApplicationRecord
  has_secure_password validations: false
  has_one_attached :avatar

  # `partner` is an external business acting as a bookable provider: it behaves
  # like `employee` for login (password via staff_login) and access, but is
  # exempt from the company-domain email rule below (partners use their own
  # email). See employee_email_on_company_domain (the franchise's staff domain).
  # `super_admin` runs every franchise (creates them, invites their admins); an
  # `admin` runs one franchise. Staff and partners belong to one franchise;
  # customers have one login across all of them (franchise_id nil).
  enum :role, { customer: "customer", employee: "employee", admin: "admin", partner: "partner",
                super_admin: "super_admin" }

  belongs_to :franchise, optional: true

  # Staff accounts are provisioned by an admin, never self-registered — locking
  # employee logins to the company domain closes off a phishing/impersonation
  # vector (a stray @gmail.com "employee" account) without restricting admin,
  # who may legitimately need a different real-world email.
  DEFAULT_STAFF_EMAIL_DOMAIN = "baydspa.ca".freeze

  has_one  :employee_profile, dependent: :destroy
  has_many :addresses, dependent: :destroy
  has_many :booking_requests, dependent: :destroy
  has_many :bookings, dependent: :destroy
  has_many :visits, dependent: :destroy
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
  has_many :web_push_subscriptions, dependent: :destroy
  has_many :webauthn_credentials, dependent: :destroy
  has_many :blocks_made, class_name: "UserBlock", foreign_key: :blocker_id, dependent: :destroy
  has_many :blocks_received, class_name: "UserBlock", foreign_key: :blocked_id, dependent: :destroy
  has_many :chat_reports_made, class_name: "ChatReport", foreign_key: :reporter_id, dependent: :destroy
  has_many :chat_reports_received, class_name: "ChatReport", foreign_key: :reported_user_id, dependent: :destroy

  # Stable, opaque handle for WebAuthn (never the email). Set on create.
  before_create { self.webauthn_id ||= SecureRandom.uuid }
  has_many :invoices, dependent: :destroy
  has_many :subscriptions, dependent: :destroy
  has_many :magic_link_tokens, dependent: :destroy
  has_many :payment_profiles, dependent: :destroy

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
  # Staff, partners and franchise admins belong to the franchise they were
  # added in.
  before_validation(on: :create) do
    self.franchise ||= Current.franchise || Franchise.default if role.in?(%w[employee admin partner])
  end
  before_create :assign_referral_code
  after_create :create_loyalty_account

  # Who hears about a franchise's operational events (follow-ups, no-shows,
  # missed jobs): that franchise's admins, never another franchise's.
  scope :franchise_admins, lambda { |franchise = Current.franchise|
    where(role: "admin", deleted_at: nil, franchise_id: (franchise || Franchise.default).id)
  }

  # A super admin can do everything a franchise admin can, in any franchise.
  def admin? = role.in?(%w[admin super_admin])

  # The card on file with the franchise's payment provider. A card saved before
  # franchising (still on the user row) counts for the default franchise's
  # Square account until it's replaced.
  def payment_profile(franchise = Franchise.current)
    payment_profiles.find_by(franchise_id: franchise.id) || legacy_profile(franchise)
  end

  def card_on_file?(franchise = Franchise.current) = payment_profile(franchise)&.card_on_file? || false

  # Prefers a real uploaded avatar; falls back to the plain URL string (SSO
  # avatars, or an admin who set one manually before uploads existed).
  # url_helpers is called module-qualified (not mixed in) - rails_blob_url
  # needs full routing context that a plain include/extend doesn't provide.
  def avatar_image_url
    avatar.attached? ? Rails.application.routes.url_helpers.rails_blob_url(avatar) : avatar_url
  end

  # The photo other people see (e.g. in chat): a tech's staff-app profile photo,
  # otherwise the account avatar.
  def display_photo_url
    employee_profile&.photo_image_url.presence || avatar_image_url
  end

  private

  def legacy_profile(franchise)
    return unless franchise.is_default && square_card_id.present?

    payment_profiles.build(franchise: franchise, gateway: "square", customer_ref: square_customer_id,
                           card_ref: square_card_id, card_brand: card_brand, card_last4: card_last4)
  end

  def email_or_phone_present
    return if email.present? || phone.present?

    errors.add(:base, "Email or phone is required")
  end

  def employee_email_on_company_domain
    domain = "@#{franchise&.staff_email_domain.presence || DEFAULT_STAFF_EMAIL_DOMAIN}"
    return if email.to_s.downcase.end_with?(domain)

    errors.add(:email, "must be a #{domain} address for staff accounts")
  end

  def assign_referral_code
    return if referral_code.present?

    loop do
      candidate = SecureRandom.alphanumeric(8).upcase
      break self.referral_code = candidate unless User.exists?(referral_code: candidate)
    end
  end
end
