class SubscriptionSerializer < Blueprinter::Base
  identifier :id
  fields :interval_unit, :interval_count, :status, :next_run_at, :auto_charge, :price,
         :started_at, :last_booking_at, :created_at

  field :frequency_label, &:frequency_label

  field :service_name do |sub|
    sub.service&.name
  end

  field :address_label do |sub|
    sub.address && [ sub.address.line1, sub.address.city ].compact.join(", ")
  end

  # Upcoming charge (only meaningful while active + auto-charging).
  field :next_charge do |sub|
    next nil unless sub.status_active? && sub.auto_charge

    { on: sub.next_run_at, amount: sub.price }
  end

  field :customer do |sub|
    {
      id: sub.user_id,
      name: [ sub.user&.first_name, sub.user&.last_name ].compact.join(" ").strip.presence || sub.user&.email,
      email: sub.user&.email
    }
  end

  # Detail view adds billing/appointment history.
  view :detail do
    field :history do |sub|
      sub.bookings.includes(:payments).order(starts_at: :desc).limit(24).map do |b|
        payment = b.payments.where(status: "paid").order(:created_at).last
        {
          booking_id: b.id,
          date: b.starts_at,
          status: b.status,
          amount: b.total.to_f.round(2),
          paid: payment.present?,
          paid_at: payment&.paid_at,
          processor: payment&.processor
        }
      end
    end
  end
end
