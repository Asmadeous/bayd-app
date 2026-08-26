class EmployeeProfileSerializer < Blueprinter::Base
  identifier :id
  fields :title, :bio, :years_experience, :on_shift, :active, :dispatchable,
         :base_latitude, :base_longitude, :traccar_device_id, :service_fsas, :partner_id

  field :partner_name do |profile|
    profile.partner&.name
  end

  # Prefers a real uploaded photo; falls back to the plain URL string.
  field :photo_url do |profile|
    if profile.photo.attached?
      Rails.application.routes.url_helpers.rails_blob_url(profile.photo)
    else
      profile.photo_url
    end
  end

  association :user, blueprint: UserSerializer
end
