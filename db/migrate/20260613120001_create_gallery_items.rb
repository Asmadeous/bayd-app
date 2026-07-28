class CreateGalleryItems < ActiveRecord::Migration[8.1]
  def change
    create_table :gallery_items do |t|
      t.string  :title,       null: false
      t.string  :category,    null: false
      t.text    :description
      t.string  :image_url,   null: false
      t.string  :image_alt
      t.string  :size,        default: "standard"  # standard | wide | tall
      t.boolean :featured,    default: false, null: false
      t.integer :position,    default: 0,    null: false
      t.boolean :active,      default: true, null: false
      t.references :employee_profile, null: true, foreign_key: true

      t.timestamps
    end

    add_index :gallery_items, :category
    add_index :gallery_items, :featured
    add_index :gallery_items, :position
  end
end
