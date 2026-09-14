module Api
  module V1
    class ServicesController < ApplicationController
      skip_before_action :authenticate_user!, only: %i[index show]

      def index
        services = Service.active.includes(:service_category, { employee_profiles: :user }, image_attachment: :blob)
        services = services.where(service_category_id: params[:category_id]) if params[:category_id]
        render json: ServiceSerializer.render_as_hash(services)
      end

      def show
        render json: ServiceSerializer.render_as_hash(Service.active.includes(image_attachment: :blob).find(params[:id]))
      end
    end
  end
end
