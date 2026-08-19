module Api
  module V1
    module Admin
      class ProductsController < BaseController
        def index
          scope = Product.includes(:product_category).order(:name)
          scope = scope.where(product_category_id: params[:category_id]) if params[:category_id].present?
          records, meta = paginate(scope, per: 50)
          render json: { data: records.as_json(include: :product_category), pagination: meta }
        end

        def create
          render json: Product.create!(permitted_params).as_json, status: :created
        end

        def update
          product = Product.find(params[:id])
          product.update!(permitted_params)
          render json: product.as_json
        end

        def destroy
          Product.find(params[:id]).destroy!
          head :no_content
        end

        private

        def permitted_params
          permitted = params.permit(:name, :description, :price, :stock_quantity, :stock_qty,
                                    :image_url, :active, :product_category_id)
          permitted[:stock_quantity] = permitted.delete(:stock_qty) if permitted.key?(:stock_qty)
          permitted
        end
      end
    end
  end
end
