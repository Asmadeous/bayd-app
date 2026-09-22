class EmployeeProfileSerializer < Blueprinter::Base
  identifier :id

  # ── Global (safe) fields ───────────────────────────────────────────────────
  # Blueprinter views are ADDITIVE - every view inherits whatever is defined at
  # the top level. So ONLY customer-safe fields live here: a customer sees their
  # tech as id + name + photo + title + experience, never contact/earnings.
  fields :title, :years_experience

  field :photo_url do |profile|
    if profile.photo.attached?
      Rails.application.routes.url_helpers.rails_blob_url(profile.photo)
    else
      profile.photo_url
    end
  end

  # First name only - "who's coming" without the private user record.
  field :name do |profile|
    profile.user&.first_name.presence || "Your technician"
  end

  # The tech's user id ONLY (no email/phone/address). A customer needs this to
  # start an IN-APP, admin-auditable conversation with their tech - messaging is
  # mediated by the platform, so exposing the bare id enables that feature
  # without leaking any contact detail for off-platform collusion.
  field :user_id, &:user_id

  # ── Public view (CUSTOMER-facing) ──────────────────────────────────────────
  # Just the safe globals above. Explicit so intent is clear at call sites.
  view :public do
  end

  # ── Full view (STAFF / ADMIN) ──────────────────────────────────────────────
  # Adds the tech's own user record + operational fields on top of the globals.
  # Only rendered to the tech themselves or an admin, never to a customer.
  view :full do
    fields :bio, :on_shift, :active, :dispatchable,
           :base_latitude, :base_longitude, :service_fsas, :partner_id

    field :partner_name do |profile|
      profile.partner&.name
    end

    association :user, blueprint: UserSerializer

    # The services this tech performs - the staff app uses these as the add-on
    # candidates when the tech books a client (the tech's OWN other services).
    association :services, blueprint: ServiceSerializer do |profile|
      profile.services.where(active: true)
    end
  end
end
