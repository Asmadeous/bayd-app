class AddProductCategories < ActiveRecord::Migration[8.0]
  def change
    create_table :product_categories do |t|
      t.string  :name,     null: false
      t.string  :slug,     null: false
      t.text    :description
      t.string  :image_url
      t.integer :position, null: false, default: 0
      t.boolean :active,   null: false, default: true
      t.timestamps
    end
    add_index :product_categories, :slug, unique: true

    add_reference :products, :product_category, foreign_key: true
  end
end
