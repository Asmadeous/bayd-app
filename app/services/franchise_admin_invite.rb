# Adds a franchise admin: an admin login in that franchise and an email with a
# link to choose their password (the password-reset flow, longer-lived).
class FranchiseAdminInvite
  LINK_TTL = 7.days

  Result = Struct.new(:user, :error, keyword_init: true) do
    def success? = user.present?
  end

  def self.call(franchise, **attrs) = new(franchise).call(**attrs)

  def initialize(franchise)
    @franchise = franchise
  end

  def call(email:, first_name:, last_name: nil, phone: nil)
    email = email.to_s.downcase.strip
    existing = User.find_by(email: email)
    return Result.new(error: "#{email} already has an account (#{existing.role.humanize.downcase}).") if existing

    raw_token = nil
    user = nil
    ActiveRecord::Base.transaction do
      user = User.create!(role: :admin, franchise: @franchise, email: email, first_name: first_name,
                          last_name: last_name.presence, phone: phone.presence, password: SecureRandom.alphanumeric(20))
      raw_token = MagicLinkToken.issue!(user, purpose: "password_reset", ttl: LINK_TTL)
    end
    MagicLinkMailer.franchise_admin_invite(user, raw_token).deliver_later
    Result.new(user: user)
  rescue ActiveRecord::RecordInvalid => e
    Result.new(error: e.record.errors.full_messages.to_sentence)
  end
end
