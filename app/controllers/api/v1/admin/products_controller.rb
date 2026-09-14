module Api
  module V1
    module Admin
      class ProductsController < BaseController
        include Rails.application.routes.url_helpers
        include ImageUploadValidation

        def index
          scope = Product.includes(:product_category, image_attachment: :blob).order(:name)
          scope = scope.where(product_category_id: params[:category_id]) if params[:category_id].present?
          records, meta = paginate(scope, per: 50)
          render json: { data: records.map { |p| product_json(p) }, pagination: meta }
        end

        def create
          return invalid_image_response if params[:image].present? && !valid_image?(params[:image])

          product = Product.new(permitted_params)
          product.image.attach(params[:image]) if params[:image].present?
          product.save!
          render json: product_json(product), status: :created
        end

        def update
          return invalid_image_response if params[:image].present? && !valid_image?(params[:image])

          product = Product.find(params[:id])
          product.image.attach(params[:image]) if params[:image].present?
          product.update!(permitted_params)
          render json: product_json(product)
        end

        def destroy
          Product.find(params[:id]).destroy!
          head :no_content
        end

        private

        def invalid_image_response
          render json: { error: "Image must be a real JPEG, PNG, WEBP, or GIF image." }, status: :unprocessable_entity
        end

        # Include product_category (as before) + the resolved image_url (uploaded
        # blob preferred, else the legacy string) so the admin UI gets the real URL.
        def product_json(product)
          product.as_json(include: :product_category).merge(
            "image_url" => product.image.attached? ? rails_blob_url(product.image) : product.image_url
          )
        end

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
