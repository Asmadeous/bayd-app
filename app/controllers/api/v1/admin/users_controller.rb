module Api
  module V1
    module Admin
      class UsersController < BaseController
        def index
          scope = User.order(created_at: :desc)
          scope = scope.where(role: params[:role]) if params[:role].present?
          scope = scope.where("email ILIKE ?", "%#{params[:q]}%") if params[:q].present?
          records, meta = paginate(scope)
          render json: {
            data: records.map { |u| user_json(u) },
            pagination: meta
          }
        end

        def show
          render json: user_json(User.find(params[:id]))
        end

        def update
          user = User.find(params[:id])
          user.update!(permitted_params)
          render json: user_json(user)
        end

        def destroy
          User.find(params[:id]).destroy!
          head :no_content
        end

        private

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
