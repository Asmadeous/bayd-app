class VisitSerializer < Blueprinter::Base
  identifier :id
  fields :starts_at, :ends_at, :client_type, :party_size, :payment_timing,
         :booked_for_name, :booked_for_phone, :notes, :created_at

  field(:status, &:status)
  field(:subtotal, &:subtotal)
  field(:total, &:total)
  field(:amount_paid, &:amount_paid)
  field(:outstanding_balance, &:outstanding_balance)

  association :address, blueprint: AddressSerializer
  # Each service is a full booking (its own tech, status and money).
  association :lines, blueprint: BookingSerializer do |visit|
    visit.bookings.to_a
  end
end
