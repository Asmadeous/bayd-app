module Api
  module V1
    class ReferralsController < ApplicationController
      def show
        user = current_user
        app_url = ENV.fetch("APP_URL", "http://localhost:3001")
        render json: {
          code: user.referral_code,
          url: "#{app_url}/signup?ref=#{user.referral_code}",
          referrals_count: user.referrals.count,
          points_per_referral: BookingCompletedJob::REFERRAL_BONUS_POINTS
        }
      end
    end
  end
end
