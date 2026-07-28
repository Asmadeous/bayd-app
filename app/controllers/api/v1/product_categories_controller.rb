module Api
  module V1
    class ProductCategoriesController < ApplicationController
      skip_before_action :authenticate_user!

      def index
        render json: ProductCategorySerializer.render_as_hash(ProductCategory.active.includes(:products))
      end

      def show
        category = ProductCategory.active.find(params[:id])
        records, meta = paginate(category.products.active.in_stock)
        render json: {
          category: ProductCategorySerializer.render_as_hash(category),
          products: ProductSerializer.render_as_hash(records),
          pagination: meta
        }
      end
    end
  end
end
