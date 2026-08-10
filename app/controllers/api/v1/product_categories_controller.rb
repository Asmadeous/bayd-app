module Api
  module V1
    class ProductCategoriesController < ApplicationController
      skip_before_action :authenticate_user!

      def index
        roots = ProductCategory.active.roots.includes(:products, subcategories: :products)
        render json: ProductCategorySerializer.render_as_hash(roots)
      end

      def show
        category = ProductCategory.active.find(params[:id])
        # A parent category rolls up the products of its subcategories.
        category_ids = [ category.id ] + category.subcategories.pluck(:id)
        records, meta = paginate(Product.active.in_stock.where(product_category_id: category_ids))
        render json: {
          category: ProductCategorySerializer.render_as_hash(category),
          products: ProductSerializer.render_as_hash(records),
          pagination: meta
        }
      end
    end
  end
end
