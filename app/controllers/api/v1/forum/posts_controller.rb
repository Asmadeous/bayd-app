module Api
  module V1
    module Forum
      class PostsController < ApplicationController
        skip_before_action :authenticate_user!, only: :index

        def index
          topic   = ForumTopic.find_by!(slug: params[:topic_slug])
          records, meta = paginate(topic.forum_posts.approved.order(created_at: :asc).includes(:user))
          render json: { data: ForumPostSerializer.render_as_hash(records), pagination: meta }
        end

        def create
          topic = ForumTopic.find_by!(slug: params[:topic_slug])
          raise "Topic is locked" if topic.locked?
          post = topic.forum_posts.create!(body: params.dig(:post, :body), user: current_user)
          render json: ForumPostSerializer.render_as_hash(post), status: :created
        rescue RuntimeError => e
          render json: { error: e.message }, status: :unprocessable_entity
        end
      end
    end
  end
end
