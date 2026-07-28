class EmployeeProfileSerializer < Blueprinter::Base
  identifier :id
  fields :title, :bio, :photo_url, :years_experience, :on_shift, :active, :dispatchable,
         :base_latitude, :base_longitude, :simplybook_unit_id, :service_fsas, :partner_id

  field :partner_name do |profile|
    profile.partner&.name
  end

  association :user, blueprint: UserSerializer
end
