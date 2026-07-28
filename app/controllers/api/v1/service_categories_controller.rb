module Api
  module V1
    class ServiceCategoriesController < ApplicationController
      skip_before_action :authenticate_user!

      def index
        render json: ServiceCategorySerializer.render_as_hash(ServiceCategory.all.includes(:services))
      end
    end
  end
end
