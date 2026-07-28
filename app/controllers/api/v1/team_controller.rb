module Api
  module V1
    # Public staff directory + individual technician profiles with reviews.
    class TeamController < ApplicationController
      skip_before_action :authenticate_user!

      def index
        members = EmployeeProfile.active
                                 .includes(:user, :reviews)
                                 .order(:created_at)
        render json: { data: TeamMemberSerializer.render_as_hash(members) }
      end

      def show
        member = EmployeeProfile.active
                                .includes(:user, :services, reviews: :user)
                                .find(params[:id])
        render json: TeamMemberSerializer.render_as_hash(member, view: :detail)
      end
    end
  end
end
