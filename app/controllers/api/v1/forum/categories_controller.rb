module Api
  module V1
    module Forum
      class CategoriesController < ApplicationController
        skip_before_action :authenticate_user!

        def index
          render json: ForumCategorySerializer.render_as_hash(ForumCategory.all.includes(:forum_topics))
        end

        def show
          render json: ForumCategorySerializer.render_as_hash(ForumCategory.find_by!(slug: params[:slug]))
        end
      end
    end
  end
end
