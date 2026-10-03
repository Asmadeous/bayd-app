class UserSerializer < Blueprinter::Base
  identifier :id
  fields :email, :first_name, :last_name, :phone, :role, :marketing_opt_in, :created_at, :franchise_id
  fields :referral_code
  # The card on file in the franchise the request is in.
  field(:card_brand) { |user| user.payment_profile&.card_brand }
  field(:card_last4) { |user| user.payment_profile&.card_last4 }
  fields :street_address, :city, :country, :postal_code, :special_needs

  field :has_card_on_file, &:card_on_file?

  field :avatar_url, &:avatar_image_url
end
