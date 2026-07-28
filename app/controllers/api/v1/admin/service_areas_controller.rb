module Api
  module V1
    module Admin
      class ServiceAreasController < BaseController
        def index
          render json: ServiceAreaSerializer.render_as_hash(ServiceArea.all.includes(:employee_profiles))
        end

        def create
          area = ServiceArea.create!(area_params)
          render json: ServiceAreaSerializer.render_as_hash(area), status: :created
        end

        def update
          area = ServiceArea.find(params[:id])
          area.update!(area_params)
          render json: ServiceAreaSerializer.render_as_hash(area)
        end

        def destroy
          ServiceArea.find(params[:id]).destroy!
          head :no_content
        end

        private

        def area_params
          params.require(:service_area).permit(
            :name, :slug, :travel_fee, :active,
            :center_latitude, :center_longitude, :radius_meters,
            postal_codes: []
          )
        end
      end
    end
  end
end
