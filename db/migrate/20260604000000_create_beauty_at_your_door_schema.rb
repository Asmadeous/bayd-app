# Beauty at Your Door — full backend schema.

class CreateBeautyAtYourDoorSchema < ActiveRecord::Migration[8.0]
  def change
    enable_extension "postgis"   unless extension_enabled?("postgis")
    enable_extension "pgcrypto"  unless extension_enabled?("pgcrypto")

    create_table :users do |t|
      t.string  :email,                null: false
      t.string  :password_digest,      null: false
      t.string  :first_name
      t.string  :last_name
      t.string  :phone
      t.string  :role,                 null: false, default: "customer"
      t.string  :simplybook_client_id
      t.boolean :marketing_opt_in,      null: false, default: false
      t.timestamps
    end
    add_index :users, :email, unique: true
    add_index :users, :role
    add_index :users, :simplybook_client_id, unique: true, where: "simplybook_client_id IS NOT NULL"

    create_table :employee_profiles do |t|
      t.references :user, null: false, foreign_key: true, index: { unique: true }
      t.string  :title
      t.text    :bio
      t.string  :photo_url
      t.integer :years_experience
      t.string  :simplybook_unit_id
      t.string  :traccar_device_id
      t.decimal :base_latitude,  precision: 10, scale: 6
      t.decimal :base_longitude, precision: 10, scale: 6
      t.boolean :on_shift,      null: false, default: false
      t.boolean :dispatchable,  null: false, default: true
      t.boolean :active,        null: false, default: true
      t.timestamps
    end
    add_index :employee_profiles, :simplybook_unit_id, unique: true, where: "simplybook_unit_id IS NOT NULL"
    add_index :employee_profiles, :traccar_device_id,  unique: true, where: "traccar_device_id IS NOT NULL"
    execute <<~SQL
      CREATE INDEX index_employee_profiles_on_base_location
        ON employee_profiles
        USING gist (CAST(ST_SetSRID(ST_MakePoint(base_longitude, base_latitude), 4326) AS geography));
    SQL

    create_table :employee_current_locations do |t|
      t.references :employee_profile, null: false, foreign_key: true, index: { unique: true }
      t.decimal :latitude,       precision: 10, scale: 6, null: false
      t.decimal :longitude,      precision: 10, scale: 6, null: false
      t.integer :accuracy_meters
      t.datetime :recorded_at,   null: false
      t.timestamps
    end
    execute <<~SQL
      CREATE INDEX index_employee_current_locations_on_point
        ON employee_current_locations
        USING gist (CAST(ST_SetSRID(ST_MakePoint(longitude, latitude), 4326) AS geography));
    SQL

    create_table :location_pings do |t|
      t.references :employee_profile, null: false, foreign_key: true
      t.decimal :latitude,       precision: 10, scale: 6, null: false
      t.decimal :longitude,      precision: 10, scale: 6, null: false
      t.integer :accuracy_meters
      t.datetime :recorded_at,   null: false
      t.string :source
      t.timestamps
    end
    add_index :location_pings, [ :employee_profile_id, :recorded_at ]

    create_table :service_areas do |t|
      t.string  :name,        null: false
      t.string  :slug,        null: false
      t.decimal :travel_fee,  precision: 10, scale: 2, null: false, default: 0
      t.boolean :active,      null: false, default: true
      t.timestamps
    end
    add_index :service_areas, :slug, unique: true

    create_table :employee_service_areas do |t|
      t.references :employee_profile, null: false, foreign_key: true
      t.references :service_area,     null: false, foreign_key: true
      t.integer :max_travel_km
      t.timestamps
    end
    add_index :employee_service_areas, [ :employee_profile_id, :service_area_id ],
              unique: true, name: "index_emp_service_areas_unique"

    create_table :service_categories do |t|
      t.string  :name,     null: false
      t.string  :slug,     null: false
      t.integer :position, null: false, default: 0
      t.timestamps
    end
    add_index :service_categories, :slug, unique: true

    create_table :services do |t|
      t.references :service_category, null: false, foreign_key: true
      t.string  :name,             null: false
      t.text    :description
      t.integer :duration_minutes, null: false
      t.decimal :price,            precision: 10, scale: 2, null: false, default: 0
      t.string  :simplybook_event_id
      t.string  :image_url
      t.boolean :requires_consultation, null: false, default: false
      t.boolean :active,           null: false, default: true
      t.timestamps
    end
    add_index :services, :simplybook_event_id, unique: true, where: "simplybook_event_id IS NOT NULL"

    create_table :employee_services do |t|
      t.references :employee_profile, null: false, foreign_key: true
      t.references :service,          null: false, foreign_key: true
      t.decimal :price_override, precision: 10, scale: 2
      t.timestamps
    end
    add_index :employee_services, [ :employee_profile_id, :service_id ],
              unique: true, name: "index_employee_services_unique"

    create_table :addresses do |t|
      t.references :user, null: false, foreign_key: true
      t.string  :label
      t.string  :line1, null: false
      t.string  :line2
      t.string  :city
      t.string  :province
      t.string  :postal_code
      t.decimal :latitude,  precision: 10, scale: 6
      t.decimal :longitude, precision: 10, scale: 6
      t.boolean :default,   null: false, default: false
      t.timestamps
    end
    add_index :addresses, :user_id, name: "index_addresses_on_user"

    create_table :booking_requests do |t|
      t.references :user,    null: false, foreign_key: true
      t.references :service, null: false, foreign_key: true
      t.references :address, foreign_key: true
      t.string   :kind,   null: false
      t.string   :status, null: false, default: "pending"
      t.datetime :requested_start
      t.datetime :requested_window_end
      t.decimal  :customer_latitude,  precision: 10, scale: 6
      t.decimal  :customer_longitude, precision: 10, scale: 6
      t.datetime :captured_at
      t.references :assigned_employee, foreign_key: { to_table: :employee_profiles }
      t.decimal  :assigned_distance_km, precision: 8, scale: 3
      t.string   :location_source
      t.timestamps
    end
    add_index :booking_requests, :status
    add_index :booking_requests, :kind

    create_table :assignment_attempts do |t|
      t.references :booking_request, null: false, foreign_key: true
      t.jsonb :candidates, null: false, default: {}
      t.references :chosen_employee, foreign_key: { to_table: :employee_profiles }
      t.string :reason
      t.timestamps
    end

    create_table :bookings do |t|
      t.references :user,             null: false, foreign_key: true
      t.references :employee_profile, null: false, foreign_key: true
      t.references :service,          null: false, foreign_key: true
      t.references :booking_request,  foreign_key: true
      t.references :address,          foreign_key: true
      t.string   :simplybook_id
      t.datetime :starts_at, null: false
      t.datetime :ends_at,   null: false
      t.string   :status, null: false, default: "confirmed"
      t.decimal  :subtotal,   precision: 10, scale: 2, null: false, default: 0
      t.decimal  :travel_fee, precision: 10, scale: 2, null: false, default: 0
      t.decimal  :total,      precision: 10, scale: 2, null: false, default: 0
      t.decimal  :service_latitude,  precision: 10, scale: 6
      t.decimal  :service_longitude, precision: 10, scale: 6
      t.text     :notes
      t.string   :cancellation_reason
      t.jsonb    :raw, null: false, default: {}
      t.datetime :synced_at
      t.timestamps
    end
    add_index :bookings, :simplybook_id, unique: true, where: "simplybook_id IS NOT NULL"
    add_index :bookings, :status
    add_index :bookings, [ :employee_profile_id, :starts_at ]

    create_table :sync_events do |t|
      t.string  :provider,   null: false
      t.string  :event_type, null: false
      t.string  :external_id
      t.jsonb   :payload, null: false, default: {}
      t.boolean :signature_verified, null: false, default: false
      t.datetime :processed_at
      t.timestamps
    end
    add_index :sync_events, [ :provider, :external_id ], unique: true,
              where: "external_id IS NOT NULL"

    create_table :payments do |t|
      t.references :payable, polymorphic: true, null: false
      t.decimal :amount, precision: 10, scale: 2, null: false
      t.string  :status, null: false, default: "pending"
      t.string  :method
      t.string  :processor
      t.string  :processor_ref
      t.datetime :paid_at
      t.timestamps
    end

    create_table :gift_cards do |t|
      t.string :code, null: false
      t.references :purchaser, foreign_key: { to_table: :users }
      t.decimal :initial_balance, precision: 10, scale: 2, null: false
      t.decimal :current_balance, precision: 10, scale: 2, null: false
      t.string  :recipient_email
      t.datetime :expires_at
      t.boolean :active, null: false, default: true
      t.timestamps
    end
    add_index :gift_cards, :code, unique: true

    create_table :gift_card_transactions do |t|
      t.references :gift_card, null: false, foreign_key: true
      t.references :booking,   foreign_key: true
      t.decimal :amount, precision: 10, scale: 2, null: false
      t.string  :kind, null: false
      t.timestamps
    end

    create_table :loyalty_accounts do |t|
      t.references :user, null: false, foreign_key: true, index: { unique: true }
      t.integer :points_balance, null: false, default: 0
      t.timestamps
    end

    create_table :loyalty_transactions do |t|
      t.references :loyalty_account, null: false, foreign_key: true
      t.references :booking, foreign_key: true
      t.integer :points, null: false
      t.string  :kind,   null: false
      t.string  :description
      t.timestamps
    end

    create_table :reviews do |t|
      t.references :user,    null: false, foreign_key: true
      t.references :booking, foreign_key: true
      t.references :employee_profile, foreign_key: true
      t.integer :rating, null: false
      t.text    :body
      t.boolean :approved, null: false, default: false
      t.boolean :featured, null: false, default: false
      t.timestamps
    end

    create_table :products do |t|
      t.string  :name, null: false
      t.text    :description
      t.string  :sku
      t.decimal :price, precision: 10, scale: 2, null: false, default: 0
      t.integer :stock_quantity, null: false, default: 0
      t.string  :image_url
      t.boolean :active, null: false, default: true
      t.timestamps
    end
    add_index :products, :sku, unique: true, where: "sku IS NOT NULL"

    create_table :orders do |t|
      t.references :user, null: false, foreign_key: true
      t.string  :status, null: false, default: "pending"
      t.decimal :total, precision: 10, scale: 2, null: false, default: 0
      t.references :shipping_address, foreign_key: { to_table: :addresses }
      t.timestamps
    end

    create_table :order_items do |t|
      t.references :order,   null: false, foreign_key: true
      t.references :product, null: false, foreign_key: true
      t.integer :quantity, null: false, default: 1
      t.decimal :price,    precision: 10, scale: 2, null: false
      t.string  :name
      t.timestamps
    end

    create_table :blog_posts do |t|
      t.references :author, foreign_key: { to_table: :users }
      t.string  :title, null: false
      t.string  :slug,  null: false
      t.text    :excerpt
      t.text    :body
      t.string  :cover_image_url
      t.string  :status, null: false, default: "draft"
      t.datetime :published_at
      t.timestamps
    end
    add_index :blog_posts, :slug, unique: true
    add_index :blog_posts, :status

    create_table :blog_comments do |t|
      t.references :blog_post, null: false, foreign_key: true
      t.references :user,      foreign_key: true
      t.string  :author_name
      t.text    :body, null: false
      t.boolean :approved, null: false, default: false
      t.timestamps
    end

    create_table :forum_categories do |t|
      t.string  :name, null: false
      t.string  :slug, null: false
      t.text    :description
      t.integer :position, null: false, default: 0
      t.timestamps
    end
    add_index :forum_categories, :slug, unique: true

    create_table :forum_topics do |t|
      t.references :forum_category, null: false, foreign_key: true
      t.references :user,           null: false, foreign_key: true
      t.string  :title, null: false
      t.string  :slug,  null: false
      t.boolean :pinned, null: false, default: false
      t.boolean :locked, null: false, default: false
      t.integer :posts_count, null: false, default: 0
      t.datetime :last_posted_at
      t.timestamps
    end
    add_index :forum_topics, :slug, unique: true

    create_table :forum_posts do |t|
      t.references :forum_topic, null: false, foreign_key: true
      t.references :user,        null: false, foreign_key: true
      t.text    :body, null: false
      t.boolean :approved, null: false, default: true
      t.timestamps
    end
    add_index :forum_posts, [ :forum_topic_id, :created_at ]

    create_table :newsletter_subscribers do |t|
      t.string :email, null: false
      t.references :user, foreign_key: true
      t.string :status, null: false, default: "subscribed"
      t.datetime :confirmed_at
      t.string  :unsubscribe_token, null: false
      t.string  :source
      t.timestamps
    end
    add_index :newsletter_subscribers, :email, unique: true
    add_index :newsletter_subscribers, :unsubscribe_token, unique: true

    create_table :franchise_inquiries do |t|
      t.string :name
      t.string :email
      t.string :phone
      t.string :city
      t.text   :message
      t.string :status, null: false, default: "new"
      t.timestamps
    end

    create_table :job_applications do |t|
      t.string :name
      t.string :email
      t.string :phone
      t.string :role_applied_for
      t.text   :message
      t.string :resume_url
      t.string :status, null: false, default: "new"
      t.timestamps
    end

    create_table :contact_messages do |t|
      t.string :name
      t.string :email
      t.text   :message
      t.string :status, null: false, default: "new"
      t.timestamps
    end
  end
end
