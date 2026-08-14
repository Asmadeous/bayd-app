class AddFeaturedToProducts < ActiveRecord::Migration[8.1]
  def change
    # Lets admins hand-pick "featured" products; also used as a fallback for the
    # top-sellers / recommend widget when there aren't enough real sales yet.
    add_column :products, :featured, :boolean, default: false, null: false
    add_index  :products, :featured
  end
end
