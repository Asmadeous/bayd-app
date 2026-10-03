module Api
  module V1
    module Super
      # The super admin console. Runs outside any one franchise; actions that
      # work inside a franchise set it explicitly.
      class BaseController < ApplicationController
        before_action :require_super_admin!
        before_action { Current.franchise = nil }

        private

        def franchise = @franchise ||= Franchise.find(params[:franchise_id] || params[:id])
      end
    end
  end
end
