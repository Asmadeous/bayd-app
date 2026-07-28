module Api
  module V1
    module Forum
      class TopicsController < ApplicationController
        skip_before_action :authenticate_user!, only: %i[index show]

        def index
          category = ForumCategory.find_by!(slug: params[:category_slug])
          records, meta = paginate(category.forum_topics.pinned_first)
          render json: { data: ForumTopicSerializer.render_as_hash(records), pagination: meta }
        end

        def show
          render json: ForumTopicSerializer.render_as_hash(find_topic)
        end

        def create
          category = ForumCategory.find_by!(slug: params[:category_slug])
          topic    = category.forum_topics.create!(
            title: params.dig(:topic, :title),
            user:  current_user
          )
          render json: ForumTopicSerializer.render_as_hash(topic), status: :created
        end

        def lock
          find_topic.update!(locked: !find_topic.locked)
          render json: ForumTopicSerializer.render_as_hash(find_topic)
        end

        private

        def find_topic
          @find_topic ||= ForumTopic.find_by!(slug: params[:slug])
        end
      end
    end
  end
end
