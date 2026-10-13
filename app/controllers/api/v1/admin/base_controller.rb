module Api
  module V1
    module Admin
      class BaseController < ApplicationController
        before_action :require_admin!
        before_action :require_branch_for_changes

        private

        # A super admin in "All franchises" sees every branch at once. Changes
        # need one branch picked, or new records would quietly land in the
        # default franchise.
        def require_branch_for_changes
          return if request.get? || request.head? || Current.franchise

          render json: { error: "Choose a branch under \"Working in\" before making changes." },
                 status: :unprocessable_entity
        end
      end
    end
  end
end
