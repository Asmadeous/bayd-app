# Creates a bookable provider: a staff-role User + their EmployeeProfile, and
# best-effort registers them in SimplyBook. One source of truth shared by
# Admin::EmployeesController (in-house techs, role :employee) and
# Admin::PartnersController (partner businesses, role :partner — external email
# allowed). Wrap the DB work in a single transaction; the SimplyBook write is
# best-effort and happens AFTER commit so a SimplyBook outage never rolls back
# a real staff/partner record.
class ProviderFactory
  Result = Struct.new(:profile, keyword_init: true) do
    def user = profile.user
  end

  # user_attrs:    { email:, first_name:, last_name:, phone: }
  # profile_attrs: EmployeeProfile columns (title, partner_id, active, ...)
  # role:          :employee or :partner
  # password:      explicit password, else a random 14-char one is generated
  def self.create!(user_attrs:, profile_attrs:, role: :employee, password: nil)
    profile = nil
    ActiveRecord::Base.transaction do
      user = User.new(user_attrs)
      user.role = role
      user.password = password.presence || SecureRandom.alphanumeric(14)
      user.save!
      profile = EmployeeProfile.create!(profile_attrs.merge(user: user))
    end
    register_in_simplybook(profile) if profile.simplybook_unit_id.blank?
    Result.new(profile: profile)
  end

  # Best-effort: create this provider in SimplyBook and store the returned unit
  # id. A pure admin-API write (no email verification). Never raises — the
  # provider still exists locally and an admin can set the unit id later.
  def self.register_in_simplybook(profile)
    return if ENV["SIMPLYBOOK_COMPANY"].blank?

    user = profile.user
    name = [ user.first_name, user.last_name ].compact_blank.join(" ").presence || user.email
    service_ids = profile.services.map(&:simplybook_event_id).compact
    id = SimplyBook::Client.new.create_provider(
      name: name, email: user.email, phone: user.phone, service_ids: service_ids
    )
    profile.update_columns(simplybook_unit_id: id) if id.present?
  rescue StandardError => e
    Rails.logger.warn("[ProviderFactory] SimplyBook provider create failed for #{profile.id}: #{e.message}")
  end
end
