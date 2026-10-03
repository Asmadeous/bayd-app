# This file is auto-generated from the current state of the database. Instead
# of editing this file, please use the migrations feature of Active Record to
# incrementally modify your database, and then regenerate this schema definition.
#
# This file is the source Rails uses to define your schema when running `bin/rails
# db:schema:load`. When creating a new database, `bin/rails db:schema:load` tends to
# be faster and is potentially less error prone than running all of your
# migrations from scratch. Old migrations may fail to apply correctly if those
# migrations use external dependencies or application code.
#
# It's strongly recommended that you check this file into your version control system.

ActiveRecord::Schema[8.1].define(version: 2026_10_03_114556) do
  # These are extensions that must be enabled in order to support this database
  enable_extension "btree_gist"
  enable_extension "pg_catalog.plpgsql"
  enable_extension "pgcrypto"
  enable_extension "postgis"

  create_table "active_storage_attachments", force: :cascade do |t|
    t.bigint "blob_id", null: false
    t.datetime "created_at", null: false
    t.string "name", null: false
    t.bigint "record_id", null: false
    t.string "record_type", null: false
    t.index ["blob_id"], name: "index_active_storage_attachments_on_blob_id"
    t.index ["record_type", "record_id", "name", "blob_id"], name: "index_active_storage_attachments_uniqueness", unique: true
  end

  create_table "active_storage_blobs", force: :cascade do |t|
    t.bigint "byte_size", null: false
    t.string "checksum"
    t.string "content_type"
    t.datetime "created_at", null: false
    t.string "filename", null: false
    t.string "key", null: false
    t.text "metadata"
    t.string "service_name", null: false
    t.index ["key"], name: "index_active_storage_blobs_on_key", unique: true
  end

  create_table "active_storage_variant_records", force: :cascade do |t|
    t.bigint "blob_id", null: false
    t.string "variation_digest", null: false
    t.index ["blob_id", "variation_digest"], name: "index_active_storage_variant_records_uniqueness", unique: true
  end

  create_table "addresses", force: :cascade do |t|
    t.string "buzz_code"
    t.string "city"
    t.datetime "created_at", null: false
    t.boolean "default", default: false, null: false
    t.boolean "is_apartment", default: false, null: false
    t.string "label"
    t.decimal "latitude", precision: 10, scale: 6
    t.string "line1", null: false
    t.string "line2"
    t.decimal "longitude", precision: 10, scale: 6
    t.string "postal_code"
    t.string "province"
    t.datetime "updated_at", null: false
    t.bigint "user_id", null: false
    t.index ["user_id"], name: "index_addresses_on_user"
    t.index ["user_id"], name: "index_addresses_on_user_id"
  end

  create_table "assignment_attempts", force: :cascade do |t|
    t.bigint "booking_request_id", null: false
    t.jsonb "candidates", default: {}, null: false
    t.bigint "chosen_employee_id"
    t.datetime "created_at", null: false
    t.bigint "franchise_id", default: 1, null: false
    t.string "reason"
    t.datetime "updated_at", null: false
    t.index ["booking_request_id"], name: "index_assignment_attempts_on_booking_request_id"
    t.index ["chosen_employee_id"], name: "index_assignment_attempts_on_chosen_employee_id"
    t.index ["franchise_id"], name: "index_assignment_attempts_on_franchise_id"
  end

  create_table "availability_overrides", force: :cascade do |t|
    t.boolean "available", default: true, null: false
    t.datetime "created_at", null: false
    t.date "date", null: false
    t.bigint "employee_profile_id", null: false
    t.time "end_time"
    t.time "start_time"
    t.datetime "updated_at", null: false
    t.index ["employee_profile_id", "date"], name: "index_availability_overrides_on_employee_profile_id_and_date", unique: true
    t.index ["employee_profile_id"], name: "index_availability_overrides_on_employee_profile_id"
  end

  create_table "availability_schedules", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.integer "day_of_week", null: false
    t.bigint "employee_profile_id", null: false
    t.time "end_time", null: false
    t.time "start_time", null: false
    t.datetime "updated_at", null: false
    t.index ["employee_profile_id", "day_of_week"], name: "idx_on_employee_profile_id_day_of_week_590b01117e"
    t.index ["employee_profile_id"], name: "index_availability_schedules_on_employee_profile_id"
  end

  create_table "blog_comments", force: :cascade do |t|
    t.boolean "approved", default: false, null: false
    t.string "author_name"
    t.bigint "blog_post_id", null: false
    t.text "body", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.bigint "user_id"
    t.index ["blog_post_id"], name: "index_blog_comments_on_blog_post_id"
    t.index ["user_id"], name: "index_blog_comments_on_user_id"
  end

  create_table "blog_posts", force: :cascade do |t|
    t.bigint "author_id"
    t.text "body"
    t.string "category"
    t.string "cover_image_url"
    t.datetime "created_at", null: false
    t.text "excerpt"
    t.datetime "published_at"
    t.string "slug", null: false
    t.string "status", default: "draft", null: false
    t.string "title", null: false
    t.datetime "updated_at", null: false
    t.index ["author_id"], name: "index_blog_posts_on_author_id"
    t.index ["category"], name: "index_blog_posts_on_category"
    t.index ["slug"], name: "index_blog_posts_on_slug", unique: true
    t.index ["status"], name: "index_blog_posts_on_status"
  end

  create_table "booking_requests", force: :cascade do |t|
    t.bigint "address_id"
    t.decimal "assigned_distance_km", precision: 8, scale: 3
    t.bigint "assigned_employee_id"
    t.boolean "auto_charge", default: false, null: false
    t.datetime "captured_at"
    t.string "client_type", default: "adult", null: false
    t.datetime "created_at", null: false
    t.decimal "customer_latitude", precision: 10, scale: 6
    t.decimal "customer_longitude", precision: 10, scale: 6
    t.bigint "franchise_id", default: 1, null: false
    t.string "kind", null: false
    t.string "location_source"
    t.integer "party_size", default: 1, null: false
    t.boolean "recurrence_active", default: false, null: false
    t.integer "recurrence_interval_weeks"
    t.bigint "requested_employee_id"
    t.datetime "requested_start"
    t.datetime "requested_window_end"
    t.bigint "service_id", null: false
    t.string "status", default: "pending", null: false
    t.datetime "updated_at", null: false
    t.bigint "user_id", null: false
    t.index ["address_id"], name: "index_booking_requests_on_address_id"
    t.index ["assigned_employee_id"], name: "index_booking_requests_on_assigned_employee_id"
    t.index ["franchise_id"], name: "index_booking_requests_on_franchise_id"
    t.index ["kind"], name: "index_booking_requests_on_kind"
    t.index ["requested_employee_id"], name: "index_booking_requests_on_requested_employee_id"
    t.index ["service_id"], name: "index_booking_requests_on_service_id"
    t.index ["status"], name: "index_booking_requests_on_status"
    t.index ["user_id"], name: "index_booking_requests_on_user_id"
  end

  create_table "bookings", force: :cascade do |t|
    t.bigint "address_id"
    t.boolean "auto_charge", default: false, null: false
    t.string "booked_for_name"
    t.string "booked_for_phone"
    t.bigint "booking_request_id"
    t.string "cancellation_reason"
    t.string "client_type", default: "adult", null: false
    t.datetime "created_at", null: false
    t.decimal "deposit_amount", precision: 10, scale: 2, default: "0.0", null: false
    t.bigint "employee_profile_id", null: false
    t.datetime "ends_at", null: false
    t.bigint "franchise_id", default: 1, null: false
    t.text "notes"
    t.decimal "overtime_amount", precision: 10, scale: 2, default: "0.0", null: false
    t.bigint "parent_booking_id"
    t.bigint "partner_id"
    t.bigint "partner_payout_id"
    t.integer "party_size", default: 1, null: false
    t.string "payment_status", default: "unpaid", null: false
    t.string "payment_timing", default: "pay_after", null: false
    t.jsonb "raw", default: {}, null: false
    t.boolean "recurrence_active", default: false, null: false
    t.integer "recurrence_interval_weeks"
    t.integer "reschedule_count", default: 0, null: false
    t.bigint "service_id", null: false
    t.decimal "service_latitude", precision: 10, scale: 6
    t.decimal "service_longitude", precision: 10, scale: 6
    t.datetime "starts_at", null: false
    t.string "status", default: "confirmed", null: false
    t.bigint "subscription_id"
    t.decimal "subtotal", precision: 10, scale: 2, default: "0.0", null: false
    t.decimal "total", precision: 10, scale: 2, default: "0.0", null: false
    t.decimal "travel_fee", precision: 10, scale: 2, default: "0.0", null: false
    t.datetime "updated_at", null: false
    t.bigint "user_id", null: false
    t.bigint "visit_id"
    t.integer "visit_position"
    t.index ["address_id"], name: "index_bookings_on_address_id"
    t.index ["booking_request_id"], name: "index_bookings_on_booking_request_id"
    t.index ["employee_profile_id", "starts_at"], name: "index_bookings_on_employee_profile_id_and_starts_at"
    t.index ["employee_profile_id"], name: "index_bookings_on_employee_profile_id"
    t.index ["franchise_id"], name: "index_bookings_on_franchise_id"
    t.index ["parent_booking_id"], name: "index_bookings_on_parent_booking_id"
    t.index ["partner_id"], name: "index_bookings_on_partner_id"
    t.index ["partner_payout_id"], name: "index_bookings_on_partner_payout_id"
    t.index ["payment_status"], name: "index_bookings_on_payment_status"
    t.index ["service_id"], name: "index_bookings_on_service_id"
    t.index ["status"], name: "index_bookings_on_status"
    t.index ["subscription_id"], name: "index_bookings_on_subscription_id"
    t.index ["user_id"], name: "index_bookings_on_user_id"
    t.index ["visit_id"], name: "index_bookings_on_visit_id"
    t.exclusion_constraint "employee_profile_id WITH =, tsrange(starts_at, ends_at) WITH &&", where: "(status)::text = ANY (ARRAY[('pending'::character varying)::text, ('confirmed'::character varying)::text, ('in_progress'::character varying)::text])", using: :gist, deferrable: :immediate, name: "no_double_booking"
  end

  create_table "callback_requests", force: :cascade do |t|
    t.string "contact_name"
    t.string "contact_phone"
    t.datetime "created_at", null: false
    t.bigint "franchise_id", default: 1, null: false
    t.text "notes"
    t.string "postal_code"
    t.bigint "service_id"
    t.string "status", default: "new", null: false
    t.datetime "updated_at", null: false
    t.bigint "user_id"
    t.index ["franchise_id"], name: "index_callback_requests_on_franchise_id"
    t.index ["service_id"], name: "index_callback_requests_on_service_id"
    t.index ["status"], name: "index_callback_requests_on_status"
    t.index ["user_id"], name: "index_callback_requests_on_user_id"
  end

  create_table "chat_reports", force: :cascade do |t|
    t.bigint "conversation_id", null: false
    t.datetime "created_at", null: false
    t.text "details"
    t.bigint "franchise_id", default: 1, null: false
    t.string "reason", null: false
    t.bigint "reported_user_id", null: false
    t.bigint "reporter_id", null: false
    t.datetime "reviewed_at"
    t.bigint "reviewed_by_id"
    t.string "status", default: "open", null: false
    t.datetime "updated_at", null: false
    t.index ["conversation_id"], name: "index_chat_reports_on_conversation_id"
    t.index ["franchise_id"], name: "index_chat_reports_on_franchise_id"
    t.index ["reported_user_id"], name: "index_chat_reports_on_reported_user_id"
    t.index ["reporter_id"], name: "index_chat_reports_on_reporter_id"
    t.index ["reviewed_by_id"], name: "index_chat_reports_on_reviewed_by_id"
    t.index ["status"], name: "index_chat_reports_on_status"
  end

  create_table "contact_messages", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.string "email"
    t.bigint "franchise_id", default: 1, null: false
    t.text "message"
    t.string "name"
    t.string "status", default: "new", null: false
    t.datetime "updated_at", null: false
    t.index ["franchise_id"], name: "index_contact_messages_on_franchise_id"
  end

  create_table "conversations", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.datetime "last_message_at"
    t.bigint "participant_one_id", null: false
    t.bigint "participant_two_id", null: false
    t.datetime "updated_at", null: false
    t.index ["participant_one_id", "participant_two_id"], name: "idx_on_participant_one_id_participant_two_id_34e343b89f", unique: true
    t.index ["participant_one_id"], name: "index_conversations_on_participant_one_id"
    t.index ["participant_two_id"], name: "index_conversations_on_participant_two_id"
  end

  create_table "device_tokens", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.string "platform", default: "android", null: false
    t.string "token", null: false
    t.datetime "updated_at", null: false
    t.bigint "user_id", null: false
    t.index ["token"], name: "index_device_tokens_on_token", unique: true
    t.index ["user_id"], name: "index_device_tokens_on_user_id"
  end

  create_table "email_verifications", force: :cascade do |t|
    t.integer "attempts", default: 0, null: false
    t.string "code_digest", null: false
    t.datetime "created_at", null: false
    t.string "email", null: false
    t.datetime "expires_at", null: false
    t.datetime "updated_at", null: false
    t.datetime "verified_at"
    t.index ["email", "created_at"], name: "index_email_verifications_on_email_and_created_at"
  end

  create_table "employee_current_locations", force: :cascade do |t|
    t.integer "accuracy_meters"
    t.datetime "created_at", null: false
    t.bigint "employee_profile_id", null: false
    t.decimal "latitude", precision: 10, scale: 6, null: false
    t.decimal "longitude", precision: 10, scale: 6, null: false
    t.datetime "recorded_at", null: false
    t.datetime "updated_at", null: false
    t.index "((st_setsrid(st_makepoint((longitude)::double precision, (latitude)::double precision), 4326))::geography)", name: "index_employee_current_locations_on_point", using: :gist
    t.index ["employee_profile_id"], name: "index_employee_current_locations_on_employee_profile_id", unique: true
  end

  create_table "employee_profiles", force: :cascade do |t|
    t.boolean "active", default: true, null: false
    t.decimal "base_latitude", precision: 10, scale: 6
    t.decimal "base_longitude", precision: 10, scale: 6
    t.text "bio"
    t.datetime "created_at", null: false
    t.boolean "dispatchable", default: true, null: false
    t.bigint "franchise_id", default: 1, null: false
    t.boolean "on_shift", default: false, null: false
    t.bigint "partner_id"
    t.string "photo_url"
    t.text "service_fsas", default: [], null: false, array: true
    t.decimal "service_radius_km", precision: 6, scale: 2
    t.string "title"
    t.datetime "updated_at", null: false
    t.bigint "user_id", null: false
    t.integer "years_experience"
    t.index "((st_setsrid(st_makepoint((base_longitude)::double precision, (base_latitude)::double precision), 4326))::geography)", name: "index_employee_profiles_on_base_location", using: :gist
    t.index ["franchise_id"], name: "index_employee_profiles_on_franchise_id"
    t.index ["partner_id"], name: "index_employee_profiles_on_partner_id"
    t.index ["service_fsas"], name: "index_employee_profiles_on_service_fsas", using: :gin
    t.index ["user_id"], name: "index_employee_profiles_on_user_id", unique: true
  end

  create_table "employee_service_areas", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.bigint "employee_profile_id", null: false
    t.integer "max_travel_km"
    t.bigint "service_area_id", null: false
    t.datetime "updated_at", null: false
    t.index ["employee_profile_id", "service_area_id"], name: "index_emp_service_areas_unique", unique: true
    t.index ["employee_profile_id"], name: "index_employee_service_areas_on_employee_profile_id"
    t.index ["service_area_id"], name: "index_employee_service_areas_on_service_area_id"
  end

  create_table "employee_services", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.bigint "employee_profile_id", null: false
    t.decimal "price_override", precision: 10, scale: 2
    t.bigint "service_id", null: false
    t.datetime "updated_at", null: false
    t.index ["employee_profile_id", "service_id"], name: "index_employee_services_unique", unique: true
    t.index ["employee_profile_id"], name: "index_employee_services_on_employee_profile_id"
    t.index ["service_id"], name: "index_employee_services_on_service_id"
  end

  create_table "forum_categories", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.text "description"
    t.string "name", null: false
    t.integer "position", default: 0, null: false
    t.string "slug", null: false
    t.datetime "updated_at", null: false
    t.index ["slug"], name: "index_forum_categories_on_slug", unique: true
  end

  create_table "forum_posts", force: :cascade do |t|
    t.boolean "approved", default: true, null: false
    t.text "body", null: false
    t.datetime "created_at", null: false
    t.bigint "forum_topic_id", null: false
    t.datetime "updated_at", null: false
    t.bigint "user_id", null: false
    t.index ["forum_topic_id", "created_at"], name: "index_forum_posts_on_forum_topic_id_and_created_at"
    t.index ["forum_topic_id"], name: "index_forum_posts_on_forum_topic_id"
    t.index ["user_id"], name: "index_forum_posts_on_user_id"
  end

  create_table "forum_topics", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.bigint "forum_category_id", null: false
    t.datetime "last_posted_at"
    t.boolean "locked", default: false, null: false
    t.boolean "pinned", default: false, null: false
    t.integer "posts_count", default: 0, null: false
    t.string "slug", null: false
    t.string "title", null: false
    t.datetime "updated_at", null: false
    t.bigint "user_id", null: false
    t.index ["forum_category_id"], name: "index_forum_topics_on_forum_category_id"
    t.index ["slug"], name: "index_forum_topics_on_slug", unique: true
    t.index ["user_id"], name: "index_forum_topics_on_user_id"
  end

  create_table "franchise_inquiries", force: :cascade do |t|
    t.string "city"
    t.datetime "created_at", null: false
    t.string "email"
    t.text "message"
    t.string "name"
    t.string "phone"
    t.string "status", default: "new", null: false
    t.datetime "updated_at", null: false
  end

  create_table "franchises", force: :cascade do |t|
    t.string "business_address"
    t.integer "close_hour", default: 19, null: false
    t.string "contact_email"
    t.string "contact_phone"
    t.string "country_code", default: "CA", null: false
    t.datetime "created_at", null: false
    t.string "currency", default: "CAD", null: false
    t.string "custom_domain"
    t.text "gateway_credentials"
    t.boolean "is_default", default: false, null: false
    t.string "locale", default: "en-CA", null: false
    t.string "name", null: false
    t.integer "open_hour", default: 9, null: false
    t.string "payment_gateway", default: "square", null: false
    t.text "privacy_body"
    t.string "reply_to_email"
    t.decimal "royalty_pct", precision: 5, scale: 2, default: "0.0", null: false
    t.string "sender_name"
    t.string "slug", null: false
    t.string "sms_sender"
    t.string "staff_email_domain"
    t.string "status", default: "draft", null: false
    t.string "subdomain"
    t.string "tax_name"
    t.decimal "tax_rate", precision: 6, scale: 4, default: "0.0", null: false
    t.string "tax_registration_number"
    t.text "terms_body"
    t.string "time_zone", default: "America/Toronto", null: false
    t.datetime "updated_at", null: false
    t.index ["custom_domain"], name: "index_franchises_on_custom_domain", unique: true, where: "(custom_domain IS NOT NULL)"
    t.index ["is_default"], name: "index_franchises_on_is_default", unique: true, where: "is_default"
    t.index ["slug"], name: "index_franchises_on_slug", unique: true
    t.index ["subdomain"], name: "index_franchises_on_subdomain", unique: true, where: "(subdomain IS NOT NULL)"
  end

  create_table "gallery_items", force: :cascade do |t|
    t.boolean "active", default: true, null: false
    t.string "category", null: false
    t.datetime "created_at", null: false
    t.text "description"
    t.bigint "employee_profile_id"
    t.boolean "featured", default: false, null: false
    t.string "image_alt"
    t.string "image_url"
    t.integer "position", default: 0, null: false
    t.string "size", default: "standard"
    t.string "title", null: false
    t.datetime "updated_at", null: false
    t.index ["category"], name: "index_gallery_items_on_category"
    t.index ["employee_profile_id"], name: "index_gallery_items_on_employee_profile_id"
    t.index ["featured"], name: "index_gallery_items_on_featured"
    t.index ["position"], name: "index_gallery_items_on_position"
  end

  create_table "gift_card_transactions", force: :cascade do |t|
    t.decimal "amount", precision: 10, scale: 2, null: false
    t.bigint "booking_id"
    t.datetime "created_at", null: false
    t.bigint "gift_card_id", null: false
    t.string "kind", null: false
    t.string "method"
    t.datetime "updated_at", null: false
    t.index ["booking_id"], name: "index_gift_card_transactions_on_booking_id"
    t.index ["gift_card_id"], name: "index_gift_card_transactions_on_gift_card_id"
  end

  create_table "gift_cards", force: :cascade do |t|
    t.boolean "active", default: true, null: false
    t.string "code", null: false
    t.datetime "created_at", null: false
    t.decimal "current_balance", precision: 10, scale: 2, null: false
    t.datetime "delivered_at"
    t.datetime "expires_at"
    t.bigint "franchise_id", default: 1, null: false
    t.decimal "initial_balance", precision: 10, scale: 2, null: false
    t.text "message"
    t.bigint "purchaser_id"
    t.string "recipient_email"
    t.string "recipient_name"
    t.string "sender_name"
    t.datetime "updated_at", null: false
    t.index ["code"], name: "index_gift_cards_on_code", unique: true
    t.index ["franchise_id"], name: "index_gift_cards_on_franchise_id"
    t.index ["purchaser_id"], name: "index_gift_cards_on_purchaser_id"
  end

  create_table "invoices", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.string "currency", default: "CAD", null: false
    t.jsonb "details", default: {}, null: false
    t.bigint "franchise_id", default: 1, null: false
    t.string "invoice_number", null: false
    t.bigint "invoiceable_id"
    t.string "invoiceable_type"
    t.datetime "issued_at"
    t.string "kind", default: "manual", null: false
    t.jsonb "line_items", default: [], null: false
    t.text "notes"
    t.datetime "paid_at"
    t.string "payment_method"
    t.string "status", default: "issued", null: false
    t.decimal "subtotal", precision: 10, scale: 2, default: "0.0", null: false
    t.decimal "tax", precision: 10, scale: 2, default: "0.0", null: false
    t.decimal "tax_rate", precision: 5, scale: 4, default: "0.0", null: false
    t.decimal "total", precision: 10, scale: 2, default: "0.0", null: false
    t.datetime "updated_at", null: false
    t.bigint "user_id", null: false
    t.index ["franchise_id"], name: "index_invoices_on_franchise_id"
    t.index ["invoice_number"], name: "index_invoices_on_invoice_number", unique: true
    t.index ["invoiceable_type", "invoiceable_id"], name: "index_invoices_on_invoiceable"
    t.index ["invoiceable_type", "invoiceable_id"], name: "index_invoices_on_source_unique", unique: true, where: "(invoiceable_id IS NOT NULL)"
    t.index ["kind"], name: "index_invoices_on_kind"
    t.index ["status"], name: "index_invoices_on_status"
    t.index ["user_id"], name: "index_invoices_on_user_id"
  end

  create_table "job_applications", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.string "email"
    t.bigint "employee_profile_id"
    t.bigint "franchise_id", default: 1, null: false
    t.bigint "job_posting_id"
    t.text "message"
    t.string "name"
    t.string "phone"
    t.string "resume_url"
    t.string "role_applied_for"
    t.string "scan_status", default: "pending", null: false
    t.string "status", default: "new", null: false
    t.datetime "updated_at", null: false
    t.index ["employee_profile_id"], name: "index_job_applications_on_employee_profile_id"
    t.index ["franchise_id"], name: "index_job_applications_on_franchise_id"
    t.index ["job_posting_id"], name: "index_job_applications_on_job_posting_id"
  end

  create_table "job_postings", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.string "department"
    t.text "description"
    t.string "employment_type", default: "full_time", null: false
    t.bigint "franchise_id", default: 1, null: false
    t.string "location"
    t.datetime "posted_at"
    t.text "requirements"
    t.decimal "salary_max", precision: 10, scale: 2
    t.decimal "salary_min", precision: 10, scale: 2
    t.string "slug", null: false
    t.string "status", default: "draft", null: false
    t.string "title", null: false
    t.datetime "updated_at", null: false
    t.index ["employment_type"], name: "index_job_postings_on_employment_type"
    t.index ["franchise_id", "slug"], name: "index_job_postings_on_franchise_id_and_slug", unique: true
    t.index ["franchise_id"], name: "index_job_postings_on_franchise_id"
    t.index ["status"], name: "index_job_postings_on_status"
  end

  create_table "location_pings", force: :cascade do |t|
    t.integer "accuracy_meters"
    t.datetime "created_at", null: false
    t.bigint "employee_profile_id", null: false
    t.decimal "latitude", precision: 10, scale: 6, null: false
    t.decimal "longitude", precision: 10, scale: 6, null: false
    t.datetime "recorded_at", null: false
    t.string "source"
    t.datetime "updated_at", null: false
    t.index ["employee_profile_id", "recorded_at"], name: "index_location_pings_on_employee_profile_id_and_recorded_at"
    t.index ["employee_profile_id"], name: "index_location_pings_on_employee_profile_id"
  end

  create_table "loyalty_accounts", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.bigint "franchise_id", default: 1, null: false
    t.integer "points_balance", default: 0, null: false
    t.datetime "updated_at", null: false
    t.bigint "user_id", null: false
    t.index ["franchise_id", "user_id"], name: "index_loyalty_accounts_on_franchise_id_and_user_id", unique: true
    t.index ["franchise_id"], name: "index_loyalty_accounts_on_franchise_id"
  end

  create_table "loyalty_transactions", force: :cascade do |t|
    t.bigint "booking_id"
    t.datetime "created_at", null: false
    t.string "description"
    t.string "kind", null: false
    t.bigint "loyalty_account_id", null: false
    t.integer "points", null: false
    t.datetime "updated_at", null: false
    t.index ["booking_id", "kind"], name: "index_loyalty_txns_on_booking_kind_unique", unique: true, where: "(booking_id IS NOT NULL)"
    t.index ["booking_id"], name: "index_loyalty_transactions_on_booking_id"
    t.index ["loyalty_account_id"], name: "index_loyalty_transactions_on_loyalty_account_id"
  end

  create_table "magic_link_tokens", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.datetime "expires_at", null: false
    t.string "purpose", default: "sign_in", null: false
    t.string "token_digest", null: false
    t.datetime "updated_at", null: false
    t.datetime "used_at"
    t.bigint "user_id", null: false
    t.index ["token_digest"], name: "index_magic_link_tokens_on_token_digest", unique: true
    t.index ["user_id"], name: "index_magic_link_tokens_on_user_id"
  end

  create_table "meetings", force: :cascade do |t|
    t.bigint "booking_id", null: false
    t.datetime "created_at", null: false
    t.datetime "ended_at"
    t.bigint "franchise_id", default: 1, null: false
    t.string "provider", default: "jitsi", null: false
    t.string "room_name", null: false
    t.datetime "scheduled_at"
    t.datetime "started_at"
    t.string "status", default: "scheduled", null: false
    t.datetime "updated_at", null: false
    t.index ["booking_id"], name: "index_meetings_on_booking_id"
    t.index ["booking_id"], name: "index_meetings_one_per_booking", unique: true
    t.index ["franchise_id"], name: "index_meetings_on_franchise_id"
    t.index ["room_name"], name: "index_meetings_on_room_name", unique: true
  end

  create_table "messages", force: :cascade do |t|
    t.text "body", null: false
    t.bigint "conversation_id", null: false
    t.datetime "created_at", null: false
    t.datetime "read_at"
    t.bigint "sender_id", null: false
    t.datetime "updated_at", null: false
    t.index ["conversation_id", "created_at"], name: "index_messages_on_conversation_id_and_created_at"
    t.index ["conversation_id"], name: "index_messages_on_conversation_id"
    t.index ["sender_id"], name: "index_messages_on_sender_id"
  end

  create_table "newsletter_campaigns", force: :cascade do |t|
    t.text "body", null: false
    t.datetime "created_at", null: false
    t.bigint "franchise_id", default: 1, null: false
    t.integer "recipients_count", default: 0, null: false
    t.datetime "sent_at"
    t.bigint "sent_by_id"
    t.string "subject", null: false
    t.datetime "updated_at", null: false
    t.index ["franchise_id"], name: "index_newsletter_campaigns_on_franchise_id"
    t.index ["sent_by_id"], name: "index_newsletter_campaigns_on_sent_by_id"
  end

  create_table "newsletter_subscribers", force: :cascade do |t|
    t.datetime "confirmed_at"
    t.datetime "created_at", null: false
    t.string "email", null: false
    t.bigint "franchise_id", default: 1, null: false
    t.string "source"
    t.string "status", default: "subscribed", null: false
    t.string "unsubscribe_token", null: false
    t.datetime "updated_at", null: false
    t.bigint "user_id"
    t.index ["franchise_id", "email"], name: "index_newsletter_subscribers_on_franchise_id_and_email", unique: true
    t.index ["franchise_id"], name: "index_newsletter_subscribers_on_franchise_id"
    t.index ["unsubscribe_token"], name: "index_newsletter_subscribers_on_unsubscribe_token", unique: true
    t.index ["user_id"], name: "index_newsletter_subscribers_on_user_id"
  end

  create_table "notifications", force: :cascade do |t|
    t.string "action_url"
    t.text "body"
    t.bigint "booking_id"
    t.datetime "created_at", null: false
    t.string "kind", null: false
    t.jsonb "metadata", default: {}, null: false
    t.datetime "read_at"
    t.string "title", null: false
    t.datetime "updated_at", null: false
    t.bigint "user_id", null: false
    t.index ["booking_id"], name: "index_notifications_on_booking_id"
    t.index ["user_id", "created_at"], name: "index_notifications_on_user_id_and_created_at"
    t.index ["user_id"], name: "index_notifications_on_user_id"
  end

  create_table "order_items", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.string "name"
    t.bigint "order_id", null: false
    t.decimal "price", precision: 10, scale: 2, null: false
    t.bigint "product_id", null: false
    t.bigint "product_variant_id"
    t.integer "quantity", default: 1, null: false
    t.datetime "updated_at", null: false
    t.index ["order_id"], name: "index_order_items_on_order_id"
    t.index ["product_id"], name: "index_order_items_on_product_id"
    t.index ["product_variant_id"], name: "index_order_items_on_product_variant_id"
  end

  create_table "orders", force: :cascade do |t|
    t.string "carrier"
    t.datetime "created_at", null: false
    t.bigint "franchise_id", default: 1, null: false
    t.datetime "shipped_at"
    t.bigint "shipping_address_id"
    t.string "status", default: "pending", null: false
    t.decimal "total", precision: 10, scale: 2, default: "0.0", null: false
    t.string "tracking_number"
    t.datetime "updated_at", null: false
    t.bigint "user_id", null: false
    t.index ["franchise_id"], name: "index_orders_on_franchise_id"
    t.index ["shipping_address_id"], name: "index_orders_on_shipping_address_id"
    t.index ["user_id"], name: "index_orders_on_user_id"
  end

  create_table "partner_payouts", force: :cascade do |t|
    t.decimal "amount", precision: 10, scale: 2, default: "0.0", null: false
    t.integer "booking_count", default: 0, null: false
    t.datetime "created_at", null: false
    t.decimal "fee_amount", precision: 10, scale: 2, default: "0.0", null: false
    t.bigint "franchise_id", default: 1, null: false
    t.decimal "gross", precision: 10, scale: 2, default: "0.0", null: false
    t.text "notes"
    t.datetime "paid_at"
    t.bigint "partner_id", null: false
    t.decimal "platform_fee_pct", precision: 5, scale: 2, default: "0.0", null: false
    t.string "status", default: "pending", null: false
    t.datetime "updated_at", null: false
    t.index ["franchise_id"], name: "index_partner_payouts_on_franchise_id"
    t.index ["partner_id"], name: "index_partner_payouts_on_partner_id"
  end

  create_table "partners", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.string "email"
    t.bigint "franchise_id", default: 1, null: false
    t.string "name", null: false
    t.text "payout_notes"
    t.string "phone"
    t.decimal "platform_fee_pct", precision: 5, scale: 2, default: "20.0", null: false
    t.string "slug", null: false
    t.string "status", default: "active", null: false
    t.datetime "updated_at", null: false
    t.index ["franchise_id", "slug"], name: "index_partners_on_franchise_id_and_slug", unique: true
    t.index ["franchise_id"], name: "index_partners_on_franchise_id"
  end

  create_table "payment_profiles", force: :cascade do |t|
    t.string "card_brand"
    t.string "card_last4"
    t.string "card_ref"
    t.datetime "created_at", null: false
    t.string "customer_ref"
    t.bigint "franchise_id", null: false
    t.string "gateway", null: false
    t.datetime "updated_at", null: false
    t.bigint "user_id", null: false
    t.index ["franchise_id"], name: "index_payment_profiles_on_franchise_id"
    t.index ["user_id", "franchise_id", "gateway"], name: "index_payment_profiles_on_user_id_and_franchise_id_and_gateway", unique: true
    t.index ["user_id"], name: "index_payment_profiles_on_user_id"
  end

  create_table "payments", force: :cascade do |t|
    t.decimal "amount", precision: 10, scale: 2, null: false
    t.datetime "created_at", null: false
    t.string "method"
    t.datetime "paid_at"
    t.bigint "payable_id", null: false
    t.string "payable_type", null: false
    t.string "processor"
    t.string "processor_ref"
    t.string "status", default: "pending", null: false
    t.datetime "updated_at", null: false
    t.index ["payable_type", "payable_id"], name: "index_payments_on_payable"
  end

  create_table "phone_verifications", force: :cascade do |t|
    t.integer "attempts", default: 0, null: false
    t.string "code_digest", null: false
    t.datetime "created_at", null: false
    t.datetime "expires_at", null: false
    t.string "phone", null: false
    t.datetime "updated_at", null: false
    t.datetime "verified_at"
    t.index ["phone", "created_at"], name: "index_phone_verifications_on_phone_and_created_at"
  end

  create_table "product_categories", force: :cascade do |t|
    t.boolean "active", default: true, null: false
    t.datetime "created_at", null: false
    t.text "description"
    t.bigint "franchise_id", default: 1, null: false
    t.string "image_url"
    t.string "name", null: false
    t.bigint "parent_id"
    t.integer "position", default: 0, null: false
    t.string "slug", null: false
    t.datetime "updated_at", null: false
    t.index ["franchise_id", "slug"], name: "index_product_categories_on_franchise_id_and_slug", unique: true
    t.index ["franchise_id"], name: "index_product_categories_on_franchise_id"
    t.index ["parent_id"], name: "index_product_categories_on_parent_id"
  end

  create_table "product_variants", force: :cascade do |t|
    t.boolean "active", default: true, null: false
    t.string "color_hex"
    t.string "color_name"
    t.datetime "created_at", null: false
    t.string "image_url"
    t.string "label", null: false
    t.integer "position", default: 0, null: false
    t.decimal "price", precision: 10, scale: 2
    t.bigint "product_id", null: false
    t.string "sku"
    t.integer "stock_quantity", default: 0, null: false
    t.datetime "updated_at", null: false
    t.index ["product_id", "position"], name: "index_product_variants_on_product_id_and_position"
    t.index ["product_id"], name: "index_product_variants_on_product_id"
    t.index ["sku"], name: "index_product_variants_on_sku", unique: true, where: "(sku IS NOT NULL)"
  end

  create_table "products", force: :cascade do |t|
    t.boolean "active", default: true, null: false
    t.datetime "created_at", null: false
    t.text "description"
    t.boolean "featured", default: false, null: false
    t.bigint "franchise_id", default: 1, null: false
    t.jsonb "gallery_urls", default: [], null: false
    t.string "image_url"
    t.string "name", null: false
    t.decimal "price", precision: 10, scale: 2, default: "0.0", null: false
    t.bigint "product_category_id"
    t.string "shipping_speed", default: "fast", null: false
    t.string "sku"
    t.integer "stock_quantity", default: 0, null: false
    t.datetime "updated_at", null: false
    t.index ["featured"], name: "index_products_on_featured"
    t.index ["franchise_id", "sku"], name: "index_products_on_franchise_id_and_sku", unique: true, where: "(sku IS NOT NULL)"
    t.index ["franchise_id"], name: "index_products_on_franchise_id"
    t.index ["product_category_id"], name: "index_products_on_product_category_id"
  end

  create_table "reviews", force: :cascade do |t|
    t.boolean "approved", default: false, null: false
    t.text "body"
    t.bigint "booking_id"
    t.datetime "created_at", null: false
    t.bigint "employee_profile_id"
    t.boolean "featured", default: false, null: false
    t.bigint "franchise_id", default: 1, null: false
    t.integer "rating", null: false
    t.datetime "updated_at", null: false
    t.bigint "user_id", null: false
    t.index ["booking_id"], name: "index_reviews_on_booking_id"
    t.index ["employee_profile_id"], name: "index_reviews_on_employee_profile_id"
    t.index ["franchise_id"], name: "index_reviews_on_franchise_id"
    t.index ["user_id"], name: "index_reviews_on_user_id"
  end

  create_table "royalty_statements", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.string "currency", null: false
    t.bigint "franchise_id", null: false
    t.decimal "gross", precision: 12, scale: 2, default: "0.0", null: false
    t.datetime "paid_at"
    t.date "period_end", null: false
    t.date "period_start", null: false
    t.decimal "refunds", precision: 12, scale: 2, default: "0.0", null: false
    t.decimal "royalty_due", precision: 12, scale: 2, default: "0.0", null: false
    t.decimal "royalty_pct", precision: 5, scale: 2, default: "0.0", null: false
    t.string "status", default: "open", null: false
    t.datetime "updated_at", null: false
    t.index ["franchise_id", "period_start"], name: "index_royalty_statements_on_franchise_id_and_period_start", unique: true
    t.index ["franchise_id"], name: "index_royalty_statements_on_franchise_id"
  end

  create_table "service_areas", force: :cascade do |t|
    t.boolean "active", default: true, null: false
    t.decimal "center_latitude", precision: 10, scale: 6
    t.decimal "center_longitude", precision: 10, scale: 6
    t.datetime "created_at", null: false
    t.bigint "franchise_id", default: 1, null: false
    t.string "name", null: false
    t.text "postal_codes", default: [], null: false, array: true
    t.integer "radius_meters"
    t.string "slug", null: false
    t.decimal "travel_fee", precision: 10, scale: 2, default: "0.0", null: false
    t.datetime "updated_at", null: false
    t.index "((st_setsrid(st_makepoint((center_longitude)::double precision, (center_latitude)::double precision), 4326))::geography)", name: "index_service_areas_on_center", where: "((center_latitude IS NOT NULL) AND (center_longitude IS NOT NULL))", using: :gist
    t.index ["franchise_id", "slug"], name: "index_service_areas_on_franchise_id_and_slug", unique: true
    t.index ["franchise_id"], name: "index_service_areas_on_franchise_id"
    t.index ["postal_codes"], name: "index_service_areas_on_postal_codes", using: :gin
  end

  create_table "service_categories", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.bigint "franchise_id", default: 1, null: false
    t.string "name", null: false
    t.integer "position", default: 0, null: false
    t.string "slug", null: false
    t.datetime "updated_at", null: false
    t.index ["franchise_id", "slug"], name: "index_service_categories_on_franchise_id_and_slug", unique: true
    t.index ["franchise_id"], name: "index_service_categories_on_franchise_id"
  end

  create_table "services", force: :cascade do |t|
    t.boolean "active", default: true, null: false
    t.datetime "created_at", null: false
    t.text "description"
    t.integer "duration_minutes", null: false
    t.bigint "franchise_id", default: 1, null: false
    t.string "image_url"
    t.boolean "kids_only", default: false, null: false
    t.string "name", null: false
    t.decimal "price", precision: 10, scale: 2, default: "0.0", null: false
    t.boolean "requires_consultation", default: false, null: false
    t.bigint "service_category_id", null: false
    t.jsonb "tier_prices", default: {}, null: false
    t.datetime "updated_at", null: false
    t.index ["franchise_id"], name: "index_services_on_franchise_id"
    t.index ["service_category_id"], name: "index_services_on_service_category_id"
  end

  create_table "settings", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.bigint "franchise_id", default: 1, null: false
    t.string "key", null: false
    t.datetime "updated_at", null: false
    t.string "value"
    t.index ["franchise_id", "key"], name: "index_settings_on_franchise_id_and_key", unique: true
    t.index ["franchise_id"], name: "index_settings_on_franchise_id"
  end

  create_table "shifts", force: :cascade do |t|
    t.boolean "arrived_late", default: false, null: false
    t.bigint "booking_id"
    t.datetime "clock_in_at", null: false
    t.decimal "clock_in_latitude", precision: 10, scale: 6, null: false
    t.decimal "clock_in_longitude", precision: 10, scale: 6, null: false
    t.datetime "clock_out_at"
    t.decimal "clock_out_latitude", precision: 10, scale: 6
    t.decimal "clock_out_longitude", precision: 10, scale: 6
    t.datetime "created_at", null: false
    t.decimal "distance_km", precision: 10, scale: 3, default: "0.0", null: false
    t.bigint "employee_profile_id", null: false
    t.bigint "franchise_id", default: 1, null: false
    t.decimal "fuel_rate_per_km", precision: 10, scale: 4
    t.decimal "fuel_reimbursement", precision: 10, scale: 2, default: "0.0", null: false
    t.text "notes"
    t.string "status", default: "open", null: false
    t.datetime "updated_at", null: false
    t.index ["booking_id"], name: "index_shifts_on_booking_id"
    t.index ["employee_profile_id", "clock_in_at"], name: "index_shifts_on_employee_profile_id_and_clock_in_at"
    t.index ["employee_profile_id"], name: "index_shifts_on_employee_profile_id"
    t.index ["employee_profile_id"], name: "index_shifts_one_open_per_employee", unique: true, where: "((status)::text = 'open'::text)"
    t.index ["franchise_id"], name: "index_shifts_on_franchise_id"
  end

  create_table "subscriptions", force: :cascade do |t|
    t.bigint "address_id"
    t.boolean "auto_charge", default: false, null: false
    t.datetime "cancelled_at"
    t.string "client_type", default: "adult", null: false
    t.datetime "created_at", null: false
    t.bigint "franchise_id", default: 1, null: false
    t.integer "interval_count", default: 1, null: false
    t.string "interval_unit", default: "week", null: false
    t.datetime "last_booking_at"
    t.datetime "next_run_at", null: false
    t.integer "party_size", default: 1, null: false
    t.datetime "paused_at"
    t.decimal "price", precision: 10, scale: 2
    t.bigint "service_id", null: false
    t.integer "service_ids", default: [], null: false, array: true
    t.datetime "started_at"
    t.string "status", default: "active", null: false
    t.datetime "updated_at", null: false
    t.bigint "user_id", null: false
    t.index ["address_id"], name: "index_subscriptions_on_address_id"
    t.index ["franchise_id"], name: "index_subscriptions_on_franchise_id"
    t.index ["service_id"], name: "index_subscriptions_on_service_id"
    t.index ["status", "next_run_at"], name: "index_subscriptions_on_status_and_next_run_at"
    t.index ["user_id"], name: "index_subscriptions_on_user_id"
  end

  create_table "support_messages", force: :cascade do |t|
    t.text "body", null: false
    t.datetime "created_at", null: false
    t.boolean "from_staff", default: false, null: false
    t.datetime "read_at"
    t.bigint "sender_id"
    t.bigint "support_thread_id", null: false
    t.datetime "updated_at", null: false
    t.index ["sender_id"], name: "index_support_messages_on_sender_id"
    t.index ["support_thread_id", "created_at"], name: "index_support_messages_on_support_thread_id_and_created_at"
    t.index ["support_thread_id"], name: "index_support_messages_on_support_thread_id"
  end

  create_table "support_threads", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.string "email", null: false
    t.bigint "franchise_id", default: 1, null: false
    t.datetime "last_message_at"
    t.string "name", null: false
    t.string "status", default: "open", null: false
    t.string "token", null: false
    t.datetime "updated_at", null: false
    t.bigint "user_id"
    t.index ["franchise_id"], name: "index_support_threads_on_franchise_id"
    t.index ["status", "last_message_at"], name: "index_support_threads_on_status_and_last_message_at"
    t.index ["token"], name: "index_support_threads_on_token", unique: true
    t.index ["user_id"], name: "index_support_threads_on_user_id"
  end

  create_table "sync_events", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.string "event_type", null: false
    t.string "external_id"
    t.jsonb "payload", default: {}, null: false
    t.datetime "processed_at"
    t.string "provider", null: false
    t.boolean "signature_verified", default: false, null: false
    t.datetime "updated_at", null: false
    t.index ["provider", "external_id"], name: "index_sync_events_on_provider_and_external_id", unique: true, where: "(external_id IS NOT NULL)"
  end

  create_table "tips", force: :cascade do |t|
    t.decimal "amount", precision: 10, scale: 2, default: "0.0", null: false
    t.bigint "booking_id", null: false
    t.datetime "created_at", null: false
    t.bigint "employee_profile_id", null: false
    t.bigint "franchise_id", default: 1, null: false
    t.string "method", default: "card", null: false
    t.datetime "paid_out_at"
    t.string "processor_ref"
    t.string "status", default: "collected", null: false
    t.datetime "updated_at", null: false
    t.index ["booking_id"], name: "index_tips_on_booking_id"
    t.index ["employee_profile_id", "status"], name: "index_tips_on_employee_profile_id_and_status"
    t.index ["employee_profile_id"], name: "index_tips_on_employee_profile_id"
    t.index ["franchise_id"], name: "index_tips_on_franchise_id"
  end

  create_table "user_blocks", force: :cascade do |t|
    t.bigint "blocked_id", null: false
    t.bigint "blocker_id", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["blocked_id"], name: "index_user_blocks_on_blocked_id"
    t.index ["blocker_id", "blocked_id"], name: "index_user_blocks_on_blocker_id_and_blocked_id", unique: true
    t.index ["blocker_id"], name: "index_user_blocks_on_blocker_id"
  end

  create_table "users", force: :cascade do |t|
    t.string "avatar_url"
    t.string "card_brand"
    t.string "card_last4"
    t.string "city"
    t.string "country", default: "Canada"
    t.datetime "created_at", null: false
    t.datetime "deleted_at"
    t.string "email"
    t.string "first_name"
    t.bigint "franchise_id"
    t.string "google_uid"
    t.string "helcim_card_token"
    t.string "last_name"
    t.boolean "marketing_opt_in", default: false, null: false
    t.string "moneris_data_key"
    t.string "password_digest"
    t.string "phone"
    t.string "postal_code"
    t.string "referral_code"
    t.bigint "referred_by_id"
    t.string "role", default: "customer", null: false
    t.boolean "special_needs", default: false, null: false
    t.string "square_card_id"
    t.string "square_customer_id"
    t.string "street_address"
    t.datetime "updated_at", null: false
    t.string "webauthn_id"
    t.index ["deleted_at"], name: "index_users_on_deleted_at"
    t.index ["email"], name: "index_users_on_email", unique: true
    t.index ["franchise_id"], name: "index_users_on_franchise_id"
    t.index ["google_uid"], name: "index_users_on_google_uid", unique: true, where: "(google_uid IS NOT NULL)"
    t.index ["phone"], name: "index_users_on_phone"
    t.index ["referral_code"], name: "index_users_on_referral_code", unique: true, where: "(referral_code IS NOT NULL)"
    t.index ["referred_by_id"], name: "index_users_on_referred_by_id"
    t.index ["role"], name: "index_users_on_role"
    t.index ["square_customer_id"], name: "index_users_on_square_customer_id", unique: true, where: "(square_customer_id IS NOT NULL)"
    t.index ["webauthn_id"], name: "index_users_on_webauthn_id", unique: true
  end

  create_table "visits", force: :cascade do |t|
    t.bigint "address_id"
    t.string "booked_for_name"
    t.string "booked_for_phone"
    t.string "client_type", default: "adult", null: false
    t.datetime "created_at", null: false
    t.datetime "ends_at", null: false
    t.bigint "franchise_id", default: 1, null: false
    t.text "notes"
    t.integer "party_size", default: 1, null: false
    t.string "payment_timing", default: "pay_after", null: false
    t.decimal "service_latitude", precision: 10, scale: 6
    t.decimal "service_longitude", precision: 10, scale: 6
    t.datetime "starts_at", null: false
    t.datetime "updated_at", null: false
    t.bigint "user_id", null: false
    t.index ["address_id"], name: "index_visits_on_address_id"
    t.index ["franchise_id"], name: "index_visits_on_franchise_id"
    t.index ["starts_at"], name: "index_visits_on_starts_at"
    t.index ["user_id"], name: "index_visits_on_user_id"
  end

  create_table "web_push_subscriptions", force: :cascade do |t|
    t.string "auth", null: false
    t.datetime "created_at", null: false
    t.text "endpoint", null: false
    t.string "p256dh", null: false
    t.datetime "updated_at", null: false
    t.string "user_agent"
    t.bigint "user_id", null: false
    t.index ["endpoint"], name: "index_web_push_subscriptions_on_endpoint", unique: true
    t.index ["user_id"], name: "index_web_push_subscriptions_on_user_id"
  end

  create_table "webauthn_challenges", force: :cascade do |t|
    t.string "challenge", null: false
    t.datetime "created_at", null: false
    t.datetime "expires_at", null: false
    t.string "purpose", null: false
    t.datetime "updated_at", null: false
    t.bigint "user_id", null: false
    t.index ["user_id"], name: "index_webauthn_challenges_on_user_id"
  end

  create_table "webauthn_credentials", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.string "nickname"
    t.string "public_key", null: false
    t.integer "sign_count", default: 0, null: false
    t.datetime "updated_at", null: false
    t.bigint "user_id", null: false
    t.string "webauthn_id", null: false
    t.index ["user_id"], name: "index_webauthn_credentials_on_user_id"
    t.index ["webauthn_id"], name: "index_webauthn_credentials_on_webauthn_id", unique: true
  end

  add_foreign_key "active_storage_attachments", "active_storage_blobs", column: "blob_id"
  add_foreign_key "active_storage_variant_records", "active_storage_blobs", column: "blob_id"
  add_foreign_key "addresses", "users"
  add_foreign_key "assignment_attempts", "booking_requests"
  add_foreign_key "assignment_attempts", "employee_profiles", column: "chosen_employee_id"
  add_foreign_key "assignment_attempts", "franchises"
  add_foreign_key "availability_overrides", "employee_profiles"
  add_foreign_key "availability_schedules", "employee_profiles"
  add_foreign_key "blog_comments", "blog_posts"
  add_foreign_key "blog_comments", "users"
  add_foreign_key "blog_posts", "users", column: "author_id"
  add_foreign_key "booking_requests", "addresses"
  add_foreign_key "booking_requests", "employee_profiles", column: "assigned_employee_id"
  add_foreign_key "booking_requests", "employee_profiles", column: "requested_employee_id"
  add_foreign_key "booking_requests", "franchises"
  add_foreign_key "booking_requests", "services"
  add_foreign_key "booking_requests", "users"
  add_foreign_key "bookings", "addresses"
  add_foreign_key "bookings", "booking_requests"
  add_foreign_key "bookings", "bookings", column: "parent_booking_id"
  add_foreign_key "bookings", "employee_profiles"
  add_foreign_key "bookings", "franchises"
  add_foreign_key "bookings", "partner_payouts"
  add_foreign_key "bookings", "partners"
  add_foreign_key "bookings", "services"
  add_foreign_key "bookings", "subscriptions"
  add_foreign_key "bookings", "users"
  add_foreign_key "bookings", "visits"
  add_foreign_key "callback_requests", "franchises"
  add_foreign_key "callback_requests", "services"
  add_foreign_key "callback_requests", "users"
  add_foreign_key "chat_reports", "conversations"
  add_foreign_key "chat_reports", "franchises"
  add_foreign_key "chat_reports", "users", column: "reported_user_id"
  add_foreign_key "chat_reports", "users", column: "reporter_id"
  add_foreign_key "chat_reports", "users", column: "reviewed_by_id"
  add_foreign_key "contact_messages", "franchises"
  add_foreign_key "conversations", "users", column: "participant_one_id"
  add_foreign_key "conversations", "users", column: "participant_two_id"
  add_foreign_key "device_tokens", "users"
  add_foreign_key "employee_current_locations", "employee_profiles"
  add_foreign_key "employee_profiles", "franchises"
  add_foreign_key "employee_profiles", "partners"
  add_foreign_key "employee_profiles", "users"
  add_foreign_key "employee_service_areas", "employee_profiles"
  add_foreign_key "employee_service_areas", "service_areas"
  add_foreign_key "employee_services", "employee_profiles"
  add_foreign_key "employee_services", "services"
  add_foreign_key "forum_posts", "forum_topics"
  add_foreign_key "forum_posts", "users"
  add_foreign_key "forum_topics", "forum_categories"
  add_foreign_key "forum_topics", "users"
  add_foreign_key "gallery_items", "employee_profiles"
  add_foreign_key "gift_card_transactions", "bookings"
  add_foreign_key "gift_card_transactions", "gift_cards"
  add_foreign_key "gift_cards", "franchises"
  add_foreign_key "gift_cards", "users", column: "purchaser_id"
  add_foreign_key "invoices", "franchises"
  add_foreign_key "invoices", "users"
  add_foreign_key "job_applications", "employee_profiles", on_delete: :nullify
  add_foreign_key "job_applications", "franchises"
  add_foreign_key "job_applications", "job_postings"
  add_foreign_key "job_postings", "franchises"
  add_foreign_key "location_pings", "employee_profiles"
  add_foreign_key "loyalty_accounts", "franchises"
  add_foreign_key "loyalty_accounts", "users"
  add_foreign_key "loyalty_transactions", "bookings"
  add_foreign_key "loyalty_transactions", "loyalty_accounts"
  add_foreign_key "magic_link_tokens", "users"
  add_foreign_key "meetings", "bookings"
  add_foreign_key "meetings", "franchises"
  add_foreign_key "messages", "conversations"
  add_foreign_key "messages", "users", column: "sender_id"
  add_foreign_key "newsletter_campaigns", "franchises"
  add_foreign_key "newsletter_campaigns", "users", column: "sent_by_id"
  add_foreign_key "newsletter_subscribers", "franchises"
  add_foreign_key "newsletter_subscribers", "users"
  add_foreign_key "notifications", "bookings"
  add_foreign_key "notifications", "users"
  add_foreign_key "order_items", "orders"
  add_foreign_key "order_items", "product_variants"
  add_foreign_key "order_items", "products"
  add_foreign_key "orders", "addresses", column: "shipping_address_id"
  add_foreign_key "orders", "franchises"
  add_foreign_key "orders", "users"
  add_foreign_key "partner_payouts", "franchises"
  add_foreign_key "partner_payouts", "partners"
  add_foreign_key "partners", "franchises"
  add_foreign_key "payment_profiles", "franchises"
  add_foreign_key "payment_profiles", "users"
  add_foreign_key "product_categories", "franchises"
  add_foreign_key "product_categories", "product_categories", column: "parent_id"
  add_foreign_key "product_variants", "products"
  add_foreign_key "products", "franchises"
  add_foreign_key "products", "product_categories"
  add_foreign_key "reviews", "bookings"
  add_foreign_key "reviews", "employee_profiles"
  add_foreign_key "reviews", "franchises"
  add_foreign_key "reviews", "users"
  add_foreign_key "royalty_statements", "franchises"
  add_foreign_key "service_areas", "franchises"
  add_foreign_key "service_categories", "franchises"
  add_foreign_key "services", "franchises"
  add_foreign_key "services", "service_categories"
  add_foreign_key "settings", "franchises"
  add_foreign_key "shifts", "bookings"
  add_foreign_key "shifts", "employee_profiles"
  add_foreign_key "shifts", "franchises"
  add_foreign_key "subscriptions", "addresses"
  add_foreign_key "subscriptions", "franchises"
  add_foreign_key "subscriptions", "services"
  add_foreign_key "subscriptions", "users"
  add_foreign_key "support_messages", "support_threads"
  add_foreign_key "support_messages", "users", column: "sender_id"
  add_foreign_key "support_threads", "franchises"
  add_foreign_key "support_threads", "users"
  add_foreign_key "tips", "bookings"
  add_foreign_key "tips", "employee_profiles"
  add_foreign_key "tips", "franchises"
  add_foreign_key "user_blocks", "users", column: "blocked_id"
  add_foreign_key "user_blocks", "users", column: "blocker_id"
  add_foreign_key "users", "franchises"
  add_foreign_key "users", "users", column: "referred_by_id"
  add_foreign_key "visits", "addresses"
  add_foreign_key "visits", "franchises"
  add_foreign_key "visits", "users"
  add_foreign_key "web_push_subscriptions", "users", on_delete: :cascade
  add_foreign_key "webauthn_challenges", "users"
  add_foreign_key "webauthn_credentials", "users"
end
