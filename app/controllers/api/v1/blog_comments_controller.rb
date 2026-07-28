module Api
  module V1
    class BlogCommentsController < ApplicationController
      skip_before_action :authenticate_user!, only: :index

      def index
        post     = BlogPost.published.find_by!(slug: params[:blog_post_slug])
        records, meta = paginate(post.blog_comments.approved.order(created_at: :asc))
        render json: { data: BlogCommentSerializer.render_as_hash(records), pagination: meta }
      end

      def create
        post    = BlogPost.published.find_by!(slug: params[:blog_post_slug])
        comment = post.blog_comments.create!(comment_params)
        render json: BlogCommentSerializer.render_as_hash(comment), status: :created
      end

      private

      def comment_params
        base = params.require(:comment).permit(:body, :author_name)
        base[:user] = current_user if current_user
        base
      end
    end
  end
end
