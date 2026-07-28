module Api
  module V1
    class BlogPostsController < ApplicationController
      skip_before_action :authenticate_user!, only: %i[index show]

      def index
        records, meta = paginate(BlogPost.published.includes(:author))
        render json: { data: BlogPostSerializer.render_as_hash(records), pagination: meta }
      end

      def show
        render json: BlogPostSerializer.render_as_hash(BlogPost.published.find_by!(slug: params[:slug]))
      end
    end
  end
end
