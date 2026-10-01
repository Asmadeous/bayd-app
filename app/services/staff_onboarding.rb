# Turns a job application into a staff account: an employee login on the
# company domain, a profile, the application marked hired and linked, and a
# welcome email (to the address they applied with) carrying a link to set their
# password. The account starts with no hours or service areas, so dispatch
# can't send it jobs until an admin sets those.
class StaffOnboarding
  WELCOME_LINK_TTL = 7.days

  Result = Struct.new(:success?, :profile, :error, keyword_init: true)

  def self.hire!(application, **attrs)
    new(application).hire!(**attrs)
  end

  def initialize(application)
    @application = application
  end

  def hire!(first_name:, last_name:, email:, phone: nil, title: nil)
    return Result.new(success?: false, error: "This applicant was already hired.") if @application.employee_profile

    profile = nil
    raw_token = nil
    ActiveRecord::Base.transaction do
      user = User.create!(
        role: :employee, first_name: first_name, last_name: last_name.presence,
        email: email.to_s.downcase.strip, phone: phone.presence,
        password: SecureRandom.alphanumeric(20)
      )
      profile = EmployeeProfile.create!(user: user, title: title.presence)
      @application.update!(status: "hired", employee_profile: profile)
      raw_token = MagicLinkToken.issue!(user, purpose: "password_reset", ttl: WELCOME_LINK_TTL)
    end

    MagicLinkMailer.staff_welcome(profile.user, raw_token, to: @application.email.presence || profile.user.email).deliver_later
    Result.new(success?: true, profile: profile)
  rescue ActiveRecord::RecordInvalid => e
    Result.new(success?: false, error: e.record.errors.full_messages.to_sentence)
  end
end
