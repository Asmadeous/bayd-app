module Api
  module V1
    module Admin
      class BookingRequestsController < BaseController
        def index
          scope = BookingRequest.includes(:user, :service, :address, assigned_employee: :user).order(created_at: :desc)
          scope = scope.where(status: params[:status]) if params[:status].present?
          records, meta = paginate(scope)
          render json: {
            data: records.as_json(
              include: {
                user: {},
                service: {},
                address: {},
                assigned_employee: { include: :user }
              }
            ),
            pagination: meta
          }
        end

        def show
          render json: BookingRequest.includes(
                                       :user,
                                       :service,
                                       :address,
                                       { assigned_employee: :user },
                                       { assignment_attempts: { chosen_employee: :user } }
                                     )
                                     .find(params[:id])
                                     .as_json(
                                       include: {
                                         user: {},
                                         service: {},
                                         address: {},
                                         assigned_employee: { include: :user },
                                         assignment_attempts: { include: { chosen_employee: { include: :user } } }
                                       }
                                     )
        end
      end
    end
  end
end
