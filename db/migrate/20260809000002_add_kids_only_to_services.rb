class AddKidsOnlyToServices < ActiveRecord::Migration[8.1]
  def change
    add_column :services, :kids_only, :boolean, default: false, null: false
  end
end
