class UserSerializer < Blueprinter::Base
  identifier :id
  fields :email, :first_name, :last_name, :phone, :role, :marketing_opt_in, :avatar_url, :created_at
  fields :card_brand, :card_last4, :referral_code
  fields :street_address, :city, :country, :postal_code, :special_needs

  field :has_card_on_file, &:card_on_file?
end
