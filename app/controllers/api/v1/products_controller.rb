module Api
  module V1
    class ProductsController < ApplicationController
      skip_before_action :authenticate_user!, only: %i[index show]

      def index
        scope = Product.active.in_stock.includes({ product_category: :parent }, :product_variants)
        if params[:category_id].present?
          category = ProductCategory.find_by(id: params[:category_id])
          if category
            cat_ids = [ category.id ] + category.subcategories.pluck(:id)
            scope = scope.where(product_category_id: cat_ids)
          end
        end
        per = params[:per_page] || params[:per] || (params[:page].present? ? 25 : 500)
        records, meta = paginate(scope.order(:name), per: per.to_i)
        render json: { data: ProductSerializer.render_as_hash(records), pagination: meta }
      end

      def show
        product = Product.active.includes(:product_variants).find(params[:id])
        render json: ProductSerializer.render_as_hash(product)
      end
    end
  end
end
