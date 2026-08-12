class AddGalleryUrlsToProducts < ActiveRecord::Migration[8.1]
  def change
    add_column :products, :gallery_urls, :jsonb, default: [], null: false
  end
end
