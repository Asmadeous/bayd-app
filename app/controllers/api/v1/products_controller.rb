module Api
  module V1
    class ProductsController < ApplicationController
      skip_before_action :authenticate_user!, only: %i[index show]

      def index
        scope = Product.active.in_stock.includes(:product_category)
        scope = scope.where(product_category_id: params[:category_id]) if params[:category_id]
        records, meta = paginate(scope.order(:name))
        render json: { data: ProductSerializer.render_as_hash(records), pagination: meta }
      end

      def show
        render json: ProductSerializer.render_as_hash(Product.active.find(params[:id]))
      end
    end
  end
end
