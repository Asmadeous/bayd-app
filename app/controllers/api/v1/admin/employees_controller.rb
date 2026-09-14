module Api
  module V1
    module Admin
      class EmployeesController < BaseController
        include ImageUploadValidation

        def index
          records, meta = paginate(EmployeeProfile.includes(:user, :partner, :services, :service_areas))
          render json: { data: EmployeeProfileSerializer.render_as_hash(records), pagination: meta }
        end

        def show
          render json: EmployeeProfileSerializer.render_as_hash(find_profile)
        end

        # Create a staff member: an employee-role User + their EmployeeProfile.
        def create
          return invalid_photo_response if photo_param.present? && !valid_image?(photo_param)

          profile = nil
          ActiveRecord::Base.transaction do
            user = User.new(user_params)
            user.role = :employee
            user.password = params.dig(:employee, :password).presence || SecureRandom.alphanumeric(14)
            user.save!
            profile = EmployeeProfile.create!(employee_params.merge(user: user))
            profile.photo.attach(photo_param) if photo_param.present?
          end
          render json: EmployeeProfileSerializer.render_as_hash(profile), status: :created
        end

        def update
          return invalid_photo_response if photo_param.present? && !valid_image?(photo_param)

          profile = find_profile
          ActiveRecord::Base.transaction do
            profile.user.update!(user_params) if user_fields_present?
            profile.update!(employee_params)
            profile.photo.attach(photo_param) if photo_param.present?
          end
          render json: EmployeeProfileSerializer.render_as_hash(profile)
        end

        # Remove a staff member (profile + login). Blocked if they have bookings.
        def destroy
          profile = find_profile
          ActiveRecord::Base.transaction do
            user = profile.user
            profile.destroy!
            user.destroy!
          end
          head :no_content
        rescue ActiveRecord::RecordNotDestroyed, ActiveRecord::InvalidForeignKey, ActiveRecord::DeleteRestrictionError
          render json: { error: "This staff member has bookings and can't be deleted. Set them inactive instead." },
                 status: :unprocessable_entity
        end

        def toggle_shift
          ep = find_profile
          ep.update!(on_shift: !ep.on_shift)
          render json: { on_shift: ep.on_shift }
        end

        def toggle_dispatch
          ep = find_profile
          ep.update!(dispatchable: !ep.dispatchable)
          render json: { dispatchable: ep.dispatchable }
        end

        def analytics
          ep = EmployeeProfile.includes(:user).find(params[:id])
          render json: EmployeeAnalytics.new(ep, period: params[:period]).as_json
        end

        private

        # The uploaded photo file, if any (nested under employee[photo]).
        def photo_param = params.dig(:employee, :photo)

        def invalid_photo_response
          render json: { error: "Photo must be a real JPEG, PNG, WEBP, or GIF image." }, status: :unprocessable_entity
        end

        def find_profile = EmployeeProfile.find(params[:id])

        def user_fields_present?
          e = params[:employee] || {}
          %i[email first_name last_name phone].any? { |k| e.key?(k) }
        end

        def user_params
          params.require(:employee).permit(:email, :first_name, :last_name, :phone)
        end

        def employee_params
          params.require(:employee).permit(
            :title, :bio, :photo_url, :years_experience,
            :base_latitude, :base_longitude,
            :on_shift, :dispatchable, :active, :partner_id,
            service_fsas: []
          )
        end
      end
    end
  end
end
