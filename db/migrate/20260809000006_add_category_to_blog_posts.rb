class AddCategoryToBlogPosts < ActiveRecord::Migration[8.1]
  def change
    add_column :blog_posts, :category, :string
    add_index  :blog_posts, :category
  end
end
