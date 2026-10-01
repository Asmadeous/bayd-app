module Api
  module V1
    module Admin
      # Blog comments wait for approval before they show on the post. Admins
      # moderate them across all posts, or one post via the nested route.
      class BlogCommentsController < BaseController
        def index
          scope = BlogComment.includes(:blog_post, :user).order(created_at: :desc)
          scope = scope.where(blog_post_id: params[:blog_post_id]) if params[:blog_post_id].present?
          scope = scope.where(approved: params[:approved]) unless params[:approved].nil?
          records, meta = paginate(scope)
          render json: {
            data: records.map { |comment| comment_json(comment) },
            pending_count: BlogComment.where(approved: false).count,
            pagination: meta
          }
        end

        def approve
          comment = BlogComment.find(params[:id])
          comment.update!(approved: true)
          render json: comment_json(comment)
        end

        def destroy
          BlogComment.find(params[:id]).destroy!
          head :no_content
        end

        private

        def comment_json(comment)
          BlogCommentSerializer.render_as_hash(comment).merge(
            post: { id: comment.blog_post_id, title: comment.blog_post.title, slug: comment.blog_post.slug }
          )
        end
      end
    end
  end
end
