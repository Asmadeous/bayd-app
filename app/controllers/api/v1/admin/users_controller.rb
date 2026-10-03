module Api
  module V1
    module Admin
      class UsersController < BaseController
        def index
          scope = visible_users.order(created_at: :desc)
          scope = scope.where(role: params[:role]) if params[:role].present?
          scope = scope.where("email ILIKE ?", "%#{params[:q]}%") if params[:q].present?
          records, meta = paginate(scope)
          render json: {
            data: records.map { |u| user_json(u) },
            pagination: meta
          }
        end

        def show
          render json: user_json(visible_users.find(params[:id]))
        end

        def update
          user = visible_users.find(params[:id])
          return forbidden if user.super_admin? && !current_user.super_admin?
          return forbidden if params[:role] == "super_admin" && !current_user.super_admin?

          user.update!(permitted_params)
          render json: user_json(user)
        end

        def destroy
          user = visible_users.find(params[:id])
          return forbidden if user.super_admin? && !current_user.super_admin?

          user.destroy!
          head :no_content
        end

        private

        # A franchise admin sees their own staff and the customers who booked,
        # bought or subscribed with their franchise; a super admin in the global
        # console sees everyone.
        def visible_users
          franchise = Current.franchise
          return User.all if franchise.nil?

          User.where(franchise_id: franchise.id)
              .or(User.where(id: Booking.select(:user_id)))
              .or(User.where(id: Order.select(:user_id)))
              .or(User.where(id: Subscription.select(:user_id)))
        end

        def permitted_params
          params.permit(:first_name, :last_name, :phone, :role, :marketing_opt_in)
        end

        def user_json(u)
          u.as_json(only: %i[id email first_name last_name phone role marketing_opt_in created_at])
        end
      end
    end
  end
end
