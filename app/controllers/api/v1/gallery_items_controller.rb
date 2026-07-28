module Api
  module V1
    class GalleryItemsController < ApplicationController
      def index
        scope = GalleryItem.active.ordered
        scope = scope.where(category: params[:category]) if params[:category].present?
        scope = scope.featured if params[:featured] == "true"
        render json: scope.as_json(include: { employee_profile: { only: %i[id title photo_url], include: { user: { only: %i[first_name last_name] } } } })
      end
    end
  end
end
