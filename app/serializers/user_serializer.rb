class UserSerializer < Blueprinter::Base
  identifier :id
  fields :email, :first_name, :last_name, :phone, :role, :marketing_opt_in, :created_at
  fields :card_brand, :card_last4, :referral_code
  fields :street_address, :city, :country, :postal_code, :special_needs

  field :has_card_on_file, &:card_on_file?

  # Prefers a real uploaded avatar; falls back to the plain URL string (SSO
  # avatars, or an admin who set one manually before uploads existed).
  # url_helpers is called module-qualified (not mixed in) — rails_blob_url
  # needs full routing context that a plain include/extend doesn't provide.
  field :avatar_url do |user|
    if user.avatar.attached?
      Rails.application.routes.url_helpers.rails_blob_url(user.avatar)
    else
      user.avatar_url
    end
  end
end
