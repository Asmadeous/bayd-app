module Api
  module V1
    module Admin
      class GalleryItemsController < BaseController
        include Rails.application.routes.url_helpers
        include ImageUploadValidation

        def index
          scope = GalleryItem.includes(employee_profile: :user, image_attachment: :blob).ordered
          scope = scope.where(category: params[:category]) if params[:category].present?
          records, meta = paginate(scope, per: 50)
          render json: { data: records.map { |item| gallery_item_json(item) }, pagination: meta }
        end

        def show
          render json: gallery_item_json(GalleryItem.find(params[:id]))
        end

        def create
          return invalid_image_response if params[:image].present? && !valid_image?(params[:image])

          item = GalleryItem.new(permitted_params)
          item.image.attach(params[:image]) if params[:image].present?
          item.save!
          render json: gallery_item_json(item), status: :created
        end

        def update
          return invalid_image_response if params[:image].present? && !valid_image?(params[:image])

          item = GalleryItem.find(params[:id])
          item.image.attach(params[:image]) if params[:image].present?
          item.update!(permitted_params)
          render json: gallery_item_json(item)
        end

        def destroy
          GalleryItem.find(params[:id]).destroy!
          head :no_content
        end

        private

        def invalid_image_response
          render json: { error: "Image must be a real JPEG, PNG, WEBP, or GIF image." }, status: :unprocessable_entity
        end

        # Prefers a real uploaded image; falls back to the plain URL string.
        def gallery_item_json(item)
          item.as_json(include: :employee_profile).merge(
            "image_url" => item.image.attached? ? rails_blob_url(item.image) : item.image_url
          )
        end

        def permitted_params
          params.permit(:title, :category, :description, :image_url, :image_alt,
                        :size, :featured, :position, :active, :employee_profile_id)
        end
      end
    end
  end
end
