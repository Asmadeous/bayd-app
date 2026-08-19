module Api
  module V1
    module Admin
      class BlogPostsController < BaseController
        include Rails.application.routes.url_helpers
        include ImageUploadValidation

        def index
          scope = BlogPost.includes(:author, cover_image_attachment: :blob).order(created_at: :desc)
          scope = scope.where(status: params[:status]) if params[:status].present?
          records, meta = paginate(scope)
          render json: {
            data: records.map { |post| blog_post_json(post) },
            pagination: meta
          }
        end

        def show
          render json: blog_post_json(BlogPost.find(params[:id]))
        end

        def create
          return invalid_cover_image_response if params[:cover_image].present? && !valid_image?(params[:cover_image])

          post = BlogPost.create!(permitted_params.merge(author_id: current_user.id,
                                                         slug: generate_slug(params[:title])))
          post.cover_image.attach(params[:cover_image]) if params[:cover_image].present?
          render json: blog_post_json(post), status: :created
        end

        def update
          return invalid_cover_image_response if params[:cover_image].present? && !valid_image?(params[:cover_image])

          post = BlogPost.find(params[:id])
          post.update!(permitted_params)
          post.cover_image.attach(params[:cover_image]) if params[:cover_image].present?
          render json: blog_post_json(post)
        end

        def destroy
          BlogPost.find(params[:id]).destroy!
          head :no_content
        end

        def publish
          post = BlogPost.find(params[:id])
          post.update!(status: "published", published_at: Time.current)
          render json: blog_post_json(post)
        end

        def unpublish
          post = BlogPost.find(params[:id])
          post.update!(status: "draft", published_at: nil)
          render json: blog_post_json(post)
        end

        private

        def invalid_cover_image_response
          render json: { error: "Cover image must be a real JPEG, PNG, WEBP, or GIF image." }, status: :unprocessable_entity
        end

        # Prefers a real uploaded cover image; falls back to the plain URL string.
        def blog_post_json(post)
          post.as_json(include: :author).merge(
            "cover_image_url" => post.cover_image.attached? ? rails_blob_url(post.cover_image) : post.cover_image_url
          )
        end

        def permitted_params
          params.permit(:title, :body, :excerpt, :cover_image_url, :category, :status, :published_at)
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
