module Api
  module V1
    module Admin
      class ContentController < BaseController
        # Blog comments
        def blog_comments
          records, meta = paginate(BlogComment.where(approved: false).order(created_at: :desc))
          render json: { data: BlogCommentSerializer.render_as_hash(records), pagination: meta }
        end

        def approve_comment
          BlogComment.find(params[:id]).update!(approved: true)
          head :ok
        end

        def destroy_comment
          BlogComment.find(params[:id]).destroy!
          head :no_content
        end

        # Blog posts
        def blog_posts
          records, meta = paginate(BlogPost.order(created_at: :desc))
          render json: { data: BlogPostSerializer.render_as_hash(records), pagination: meta }
        end

        def update_post
          post = BlogPost.find(params[:id])
          post.update!(status: params[:status], published_at: (Time.current if params[:status] == "published"))
          render json: BlogPostSerializer.render_as_hash(post)
        end
      end
    end
  end
end
