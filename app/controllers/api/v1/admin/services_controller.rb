module Api
  module V1
    module Admin
      class ServicesController < BaseController
        def index
          scope = Service.includes(:service_category).order(:name)
          scope = scope.where(service_category_id: params[:category_id]) if params[:category_id].present?
          records, meta = paginate(scope, per: 50)
          render json: { data: records.map { |s| service_json(s) }, pagination: meta }
        end

        def create
          service = Service.new(permitted_params)
          service.tier_prices_from(tier_price_params) if params.key?(:prices)
          service.save!
          render json: service_json(service), status: :created
        end

        def update
          service = Service.find(params[:id])
          service.assign_attributes(permitted_params)
          service.tier_prices_from(tier_price_params) if params.key?(:prices)
          service.save!
          render json: service_json(service)
        end

        def destroy
          Service.find(params[:id]).destroy!
          head :no_content
        end

        private

        def service_json(service)
          service.as_json(include: :service_category).merge(
            "prices" => service.prices, "group_size" => Service::GROUP_SIZE
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
