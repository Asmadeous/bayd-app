# Every root franchise-owned table gets a required franchise_id, filled with the
# default (Canada) franchise for all existing rows. Child rows (schedules,
# payments, order items, ...) belong to a franchise through their parent.
class AddFranchiseToTenantTables < ActiveRecord::Migration[8.1]
  TABLES = %i[
    assignment_attempts booking_requests bookings visits employee_profiles services service_categories
    service_areas partners partner_payouts shifts subscriptions tips invoices gift_cards orders products
    product_categories settings callback_requests contact_messages job_postings job_applications
    support_threads meetings reviews chat_reports newsletter_campaigns newsletter_subscribers loyalty_accounts
  ].freeze

  # [table, old unique index columns] that become unique per franchise.
  PER_FRANCHISE_UNIQUE = [
    [ :service_categories, [ :slug ] ], [ :product_categories, [ :slug ] ], [ :partners, [ :slug ] ],
    [ :service_areas, [ :slug ] ], [ :job_postings, [ :slug ] ], [ :settings, [ :key ] ],
    [ :newsletter_subscribers, [ :email ] ], [ :loyalty_accounts, [ :user_id ] ]
  ].freeze

  def up
    default_id = select_value("SELECT id FROM franchises WHERE is_default LIMIT 1")
    raise "Run CreateFranchises first: no default franchise" unless default_id

    TABLES.each do |table|
      add_reference table, :franchise, foreign_key: true
      execute "UPDATE #{table} SET franchise_id = #{default_id.to_i}"
      change_column_null table, :franchise_id, false
      # The old release keeps serving while this deploy boots; rows it saves
      # without a franchise_id land in Canada instead of failing.
      change_column_default table, :franchise_id, default_id.to_i
    end

    PER_FRANCHISE_UNIQUE.each do |table, columns|
      remove_index table, column: columns, unique: true if index_exists?(table, columns, unique: true)
      add_index table, [ :franchise_id, *columns ], unique: true
    end
    # SKUs are unique within a franchise (a copied catalog keeps its SKUs).
    remove_index :products, :sku if index_exists?(:products, :sku)
    add_index :products, [ :franchise_id, :sku ], unique: true, where: "sku IS NOT NULL"
  end

  def down
    remove_index :products, [ :franchise_id, :sku ]
    add_index :products, :sku, unique: true, where: "sku IS NOT NULL"
    PER_FRANCHISE_UNIQUE.each do |table, columns|
      remove_index table, [ :franchise_id, *columns ]
      add_index table, columns, unique: true
    end
    TABLES.each { |table| remove_reference table, :franchise, foreign_key: true }
  end
end
