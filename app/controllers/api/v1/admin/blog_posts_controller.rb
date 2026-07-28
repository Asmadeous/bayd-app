module Api
  module V1
    module Admin
      class BlogPostsController < BaseController
        def index
          scope = BlogPost.includes(:author).order(created_at: :desc)
          scope = scope.where(status: params[:status]) if params[:status].present?
          records, meta = paginate(scope)
          render json: {
            data: records.as_json(include: { author: { only: %i[id first_name last_name email] } }),
            pagination: meta
          }
        end

        def show
          render json: BlogPost.find(params[:id]).as_json(include: :author)
        end

        def create
          post = BlogPost.create!(permitted_params.merge(author_id: current_user.id,
                                                         slug: generate_slug(params[:title])))
          render json: post.as_json, status: :created
        end

        def update
          post = BlogPost.find(params[:id])
          post.update!(permitted_params)
          render json: post.as_json
        end

        def destroy
          BlogPost.find(params[:id]).destroy!
          head :no_content
        end

        def publish
          post = BlogPost.find(params[:id])
          post.update!(status: "published", published_at: Time.current)
          render json: post.as_json
        end

        def unpublish
          post = BlogPost.find(params[:id])
          post.update!(status: "draft", published_at: nil)
          render json: post.as_json
        end

        private

        def permitted_params
          params.permit(:title, :body, :excerpt, :cover_image_url, :status, :published_at, :meta_title, :meta_description)
        end

        def generate_slug(title)
          base = title.to_s.downcase.gsub(/[^a-z0-9]+/, "-").gsub(/^-|-$/, "")
          slug = base
          n = 1
          while BlogPost.exists?(slug: slug)
            slug = "#{base}-#{n}"
            n += 1
          end
          slug
        end
      end
    end
  end
end
