class MakeGalleryItemImageUrlOptional < ActiveRecord::Migration[8.1]
  def change
    # A gallery item can now carry a real uploaded image (has_one_attached
    # :image) instead of only an external image_url string — the model
    # validation already requires one or the other; the DB-level NOT NULL
    # must be dropped to match.
    change_column_null :gallery_items, :image_url, true
  end
end
