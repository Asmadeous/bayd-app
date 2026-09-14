module Api
  module V1
    module Admin
      class ServicesController < BaseController
        include Rails.application.routes.url_helpers
        include ImageUploadValidation

        def index
          scope = Service.includes(:service_category, image_attachment: :blob).order(:name)
          scope = scope.where(service_category_id: params[:category_id]) if params[:category_id].present?
          records, meta = paginate(scope, per: 50)
          render json: { data: records.map { |s| service_json(s) }, pagination: meta }
        end

        def create
          return invalid_image_response if params[:image].present? && !valid_image?(params[:image])

          service = Service.new(permitted_params)
          service.tier_prices_from(tier_price_params) if params.key?(:prices)
          service.image.attach(params[:image]) if params[:image].present?
          service.save!
          render json: service_json(service), status: :created
        end

        def update
          return invalid_image_response if params[:image].present? && !valid_image?(params[:image])

          service = Service.find(params[:id])
          service.assign_attributes(permitted_params)
          service.tier_prices_from(tier_price_params) if params.key?(:prices)
          service.image.attach(params[:image]) if params[:image].present?
          service.save!
          render json: service_json(service)
        end

        def destroy
          Service.find(params[:id]).destroy!
          head :no_content
        end

        private

        def invalid_image_response
          render json: { error: "Image must be a real JPEG, PNG, WEBP, or GIF image." }, status: :unprocessable_entity
        end

        def service_json(service)
          service.as_json(include: :service_category).merge(
            "prices" => service.prices,
            "group_size" => Service::GROUP_SIZE,
            "image_url" => service.image.attached? ? rails_blob_url(service.image) : service.image_url
          )
        end

        def permitted_params
          params.permit(:name, :description, :duration_minutes, :price, :active,
                        :service_category_id, :image_url)
        end

        # Plain hash of client_type => price; the model whitelists the keys.
        def tier_price_params
          params.require(:prices).permit(*Service::CLIENT_TYPES).to_h
        end
      end
    end
  end
end
