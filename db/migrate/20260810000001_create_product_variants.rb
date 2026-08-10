class CreateProductVariants < ActiveRecord::Migration[8.1]
  def change
    create_table :product_variants do |t|
      t.references :product, null: false, foreign_key: true
      # Display label for the swatch. Supplier colour names are often junk
      # (e.g. the bonnet's "Color14"), so the label + image_url carry the meaning.
      t.string  :label,      null: false
      t.string  :color_name              # optional human-readable colour ("Red Velvet")
      t.string  :color_hex               # optional hex for a solid swatch chip ("#7B3F00")
      t.string  :image_url               # swatch image — the selector for image-based colours (bonnet)
      # Nullable price override; falls back to the parent product's price.
      t.decimal :price, precision: 10, scale: 2
      t.string  :sku
      t.integer :stock_quantity, null: false, default: 0
      t.integer :position,       null: false, default: 0
      t.boolean :active,         null: false, default: true
      t.timestamps
    end
    add_index :product_variants, :sku, unique: true, where: "sku IS NOT NULL"
    add_index :product_variants, [ :product_id, :position ]

    # Which variant an order line refers to (nil for variant-less products).
    add_reference :order_items, :product_variant, null: true, foreign_key: true
  end
end
