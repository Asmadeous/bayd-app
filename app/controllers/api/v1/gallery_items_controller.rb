module Api
  module V1
    class GalleryItemsController < ApplicationController
      include Rails.application.routes.url_helpers

      skip_before_action :authenticate_user!, only: :index

      def index
        scope = GalleryItem.active.ordered.includes(image_attachment: :blob)
        scope = scope.where(category: params[:category]) if params[:category].present?
        scope = scope.featured if params[:featured] == "true"
        render json: scope.map { |item| gallery_item_json(item) }
      end

      private

      # Prefers a real uploaded image; falls back to the plain URL string.
      def gallery_item_json(item)
        item.as_json(include: { employee_profile: { only: %i[id title photo_url], include: { user: { only: %i[first_name last_name] } } } })
            .merge("image_url" => item.image.attached? ? rails_blob_url(item.image) : item.image_url)
      end
    end
  end
end
