module Api
  module V1
    module Admin
      class ProductCategoriesController < BaseController
        include Rails.application.routes.url_helpers
        include ImageUploadValidation

        def index
          cats = ProductCategory.includes(image_attachment: :blob).order(:name)
          render json: cats.map { |c| category_json(c) }
        end

        def create
          return invalid_image_response if params[:image].present? && !valid_image?(params[:image])

          cat = ProductCategory.new(permitted_params)
          cat.image.attach(params[:image]) if params[:image].present?
          cat.save!
          render json: category_json(cat), status: :created
        end

        def update
          return invalid_image_response if params[:image].present? && !valid_image?(params[:image])

          cat = ProductCategory.find(params[:id])
          cat.image.attach(params[:image]) if params[:image].present?
          cat.update!(permitted_params)
          render json: category_json(cat)
        end

        def destroy
          ProductCategory.find(params[:id]).destroy!
          head :no_content
        end

        private

        def invalid_image_response
          render json: { error: "Image must be a real JPEG, PNG, WEBP, or GIF image." }, status: :unprocessable_entity
        end

        def category_json(cat)
          cat.as_json.merge(
            "image_url" => cat.image.attached? ? rails_blob_url(cat.image) : cat.image_url
          )
        end

        def permitted_params
          params.permit(:name, :slug, :description, :image_url, :position, :parent_id)
        end
      end
    end
  end
end
