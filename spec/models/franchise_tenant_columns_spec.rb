require "rails_helper"

# While a deploy boots, the previous release keeps serving and saves rows without
# a franchise_id. Every tenant table needs a column default so those inserts
# land in Canada instead of failing the NOT NULL.
RSpec.describe "franchise_id on tenant tables" do
  require Rails.root.join("db/migrate/20261003112628_add_franchise_to_tenant_tables.rb").to_s

  AddFranchiseToTenantTables::TABLES.each do |table|
    it "#{table} requires a franchise and defaults one" do
      column = ActiveRecord::Base.connection.columns(table).find { |c| c.name == "franchise_id" }
      expect(column.null).to be(false)
      expect(column.default).to be_present
    end
  end
end
