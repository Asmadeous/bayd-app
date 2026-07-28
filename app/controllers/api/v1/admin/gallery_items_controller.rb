module Api
  module V1
    module Admin
      class GalleryItemsController < BaseController
        def index
          scope = GalleryItem.includes(employee_profile: :user).ordered
          scope = scope.where(category: params[:category]) if params[:category].present?
          records, meta = paginate(scope, per: 50)
          render json: { data: records.as_json(include: { employee_profile: { only: %i[id title photo_url], include: { user: { only: %i[first_name last_name] } } } }), pagination: meta }
        end

        def show
          render json: GalleryItem.find(params[:id]).as_json(include: :employee_profile)
        end

        def create
          item = GalleryItem.create!(permitted_params)
          render json: item.as_json, status: :created
        end

        def update
          item = GalleryItem.find(params[:id])
          item.update!(permitted_params)
          render json: item.as_json
        end

        def destroy
          GalleryItem.find(params[:id]).destroy!
          head :no_content
        end

        private

        def permitted_params
          params.permit(:title, :category, :description, :image_url, :image_alt,
                        :size, :featured, :position, :active, :employee_profile_id)
        end
      end
    end
  end
end
