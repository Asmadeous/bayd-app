module Api
  module V1
    class ProductsController < ApplicationController
      skip_before_action :authenticate_user!, only: %i[index show]

      def index
        scope = Product.active.in_stock.includes(:product_category, :product_variants)
        scope = scope.where(product_category_id: params[:category_id]) if params[:category_id]
        records, meta = paginate(scope.order(:name))
        render json: { data: ProductSerializer.render_as_hash(records), pagination: meta }
      end

      def show
        product = Product.active.includes(:product_variants).find(params[:id])
        render json: ProductSerializer.render_as_hash(product)
      end
    end
  end
end
