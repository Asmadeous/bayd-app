class AddressSerializer < Blueprinter::Base
  identifier :id
  fields :label, :line1, :line2, :city, :province, :postal_code,
         :latitude, :longitude, :default, :is_apartment, :buzz_code
end
