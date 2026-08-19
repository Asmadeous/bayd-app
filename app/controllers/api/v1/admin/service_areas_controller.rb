module Api
  module V1
    module Admin
      class ServiceAreasController < BaseController
        def index
          render json: ServiceAreaSerializer.render_as_hash(ServiceArea.all.includes(:employee_profiles))
        end

        # Read-only: the REAL coverage map, derived from each tech's
        # service_fsas (what AssignmentService/CoverageController actually
        # check) — not the ServiceArea zones above, which aren't wired into
        # coverage. { fsas: { "L5L" => [{employee_profile_id, name}] }, configured: bool }
        def coverage
          techs = EmployeeProfile.active.includes(:user).where("array_length(service_fsas, 1) > 0")

          by_fsa = Hash.new { |h, k| h[k] = [] }
          techs.each do |ep|
            ep.service_fsas.each { |fsa| by_fsa[fsa] << { employee_profile_id: ep.id, name: ep.user&.first_name } }
          end

          render json: { fsas: by_fsa.sort.to_h, configured: techs.exists? }
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
