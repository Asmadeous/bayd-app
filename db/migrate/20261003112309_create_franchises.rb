class CreateFranchises < ActiveRecord::Migration[8.1]
  def up
    create_table :franchises do |t|
      t.string  :name, null: false
      t.string  :slug, null: false
      t.string  :status, null: false, default: "draft"
      t.boolean :is_default, null: false, default: false
      t.string  :country_code, null: false, default: "CA"
      t.string  :currency, null: false, default: "CAD"
      t.string  :locale, null: false, default: "en-CA"
      t.string  :time_zone, null: false, default: "America/Toronto"
      t.integer :open_hour, null: false, default: 9
      t.integer :close_hour, null: false, default: 19
      t.string  :tax_name
      t.decimal :tax_rate, precision: 6, scale: 4, null: false, default: 0
      t.string  :tax_registration_number
      t.string  :contact_email
      t.string  :contact_phone
      t.string  :reply_to_email
      t.string  :sender_name
      t.string  :sms_sender
      t.string  :staff_email_domain
      t.string  :subdomain
      t.string  :custom_domain
      t.string  :payment_gateway, null: false, default: "square"
      t.text    :gateway_credentials
      t.decimal :royalty_pct, precision: 5, scale: 2, null: false, default: 0
      t.text    :privacy_body
      t.text    :terms_body
      t.string  :business_address
      t.timestamps
    end
    add_index :franchises, :slug, unique: true
    add_index :franchises, :is_default, unique: true, where: "is_default"
    add_index :franchises, :subdomain, unique: true, where: "subdomain IS NOT NULL"
    add_index :franchises, :custom_domain, unique: true, where: "custom_domain IS NOT NULL"

    add_reference :users, :franchise, foreign_key: true

    # Today's business becomes the default Canada franchise, with the values the
    # code used to hardcode, so nothing changes for it.
    hst_number = select_value("SELECT value FROM settings WHERE key = 'invoice_hst_number'")
    address = select_value("SELECT value FROM settings WHERE key = 'invoice_business_address'")
    now = Time.current
    canada_id = insert_returning_id(
      name: "B.A.Y.D Canada", slug: "canada", status: "live", is_default: true,
      country_code: "CA", currency: "CAD", locale: "en-CA",
      time_zone: ENV.fetch("BOOKING_TIMEZONE", "America/Toronto"), open_hour: 9, close_hour: 19,
      tax_name: "HST", tax_rate: 0.13, tax_registration_number: hst_number.presence,
      contact_email: ENV.fetch("SUPPORT_EMAIL", "Bookings@baydspa.ca"), contact_phone: "+1 (647) 970-8259",
      sender_name: "Beauty @ Your Door", staff_email_domain: "baydspa.ca", custom_domain: "baydspa.ca",
      payment_gateway: "square", business_address: address.presence, created_at: now, updated_at: now
    )
    execute "UPDATE users SET franchise_id = #{canada_id} WHERE role IN ('admin', 'employee', 'partner')"
  end

  def down
    remove_reference :users, :franchise, foreign_key: true
    drop_table :franchises
  end

  private

  def insert_returning_id(attrs)
    cols = attrs.keys.join(", ")
    vals = attrs.values.map { |v| connection.quote(v) }.join(", ")
    select_value("INSERT INTO franchises (#{cols}) VALUES (#{vals}) RETURNING id")
  end
end
