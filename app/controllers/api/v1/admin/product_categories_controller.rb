module Api
  module V1
    module Admin
      class ProductCategoriesController < BaseController
        def index
          render json: ProductCategory.order(:name).as_json
        end

        def create
          render json: ProductCategory.create!(permitted_params).as_json, status: :created
        end

        def update
          cat = ProductCategory.find(params[:id])
          cat.update!(permitted_params)
          render json: cat.as_json
        end

        def destroy
          ProductCategory.find(params[:id]).destroy!
          head :no_content
        end

        private

        def permitted_params
          params.permit(:name, :description, :image_url)
        end
      end
    end
  end
end
