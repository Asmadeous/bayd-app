class GiftCardSerializer < Blueprinter::Base
  identifier :id
  fields :code, :initial_balance, :current_balance, :recipient_email, :recipient_name,
         :sender_name, :message, :expires_at, :active, :delivered_at, :created_at

  field :purchaser do |gc|
    next nil unless gc.purchaser

    {
      id: gc.purchaser.id,
      email: gc.purchaser.email,
      name: [ gc.purchaser.first_name, gc.purchaser.last_name ].compact.join(" ").strip
    }
  end
end
