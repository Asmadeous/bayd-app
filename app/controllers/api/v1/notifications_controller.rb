module Api
  module V1
    class NotificationsController < ApplicationController
      def index
        records, meta = paginate(current_user.notifications.recent)
        render json: {
          data: NotificationSerializer.render_as_hash(records),
          unread_count: current_user.notifications.unread.count,
          pagination: meta
        }
      end

      def read
        notification = current_user.notifications.find(params[:id])
        notification.mark_read!
        render json: NotificationSerializer.render_as_hash(notification)
      end

      def read_all
        current_user.notifications.unread.update_all(read_at: Time.current)
        head :no_content
      end
    end
  end
end
