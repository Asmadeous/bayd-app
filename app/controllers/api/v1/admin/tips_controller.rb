module Api
  module V1
    module Admin
      # Tip payout tracking. Card tips are collected by the business and owed to
      # the technician; this lists what's owed per tech and marks it paid out.
      class TipsController < BaseController
        # Owed (card) tips grouped by technician.
        def index
          rows = Tip.owed_to_tech
                    .group(:employee_profile_id)
                    .sum(:amount)

          data = rows.map do |ep_id, total|
            ep = EmployeeProfile.includes(:user).find_by(id: ep_id)
            { employee_profile_id: ep_id,
              technician: ep&.user && "#{ep.user.first_name} #{ep.user.last_name}".strip,
              amount_owed: total }
          end
          render json: { data: data }
        end

        # Mark all currently-owed card tips for a technician as paid out.
        def payout
          ep_id = params.require(:employee_profile_id)
          tips  = Tip.owed_to_tech.where(employee_profile_id: ep_id)
          amount = tips.sum(:amount)
          count  = tips.update_all(status: "paid_out", paid_out_at: Time.current, updated_at: Time.current)
          render json: { employee_profile_id: ep_id.to_i, paid_out_count: count, amount: amount }
        end
      end
    end
  end
end
