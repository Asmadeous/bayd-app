module Api
  module V1
    module Admin
      class EmployeesController < BaseController
        def index
          records, meta = paginate(EmployeeProfile.includes(:user, :partner, :services, :service_areas))
          render json: { data: EmployeeProfileSerializer.render_as_hash(records), pagination: meta }
        end

        def show
          render json: EmployeeProfileSerializer.render_as_hash(find_profile)
        end

        # Create a staff member: an employee-role User + their EmployeeProfile.
        # If no SimplyBook provider id was supplied, we also create the provider
        # in SimplyBook via the admin API (no email verification needed) and store
        # the id — so the tech's booking account exists without app-hopping.
        def create
          profile = nil
          ActiveRecord::Base.transaction do
            user = User.new(user_params)
            user.role = :employee
            user.password = params.dig(:employee, :password).presence || SecureRandom.alphanumeric(14)
            user.save!
            profile = EmployeeProfile.create!(employee_params.merge(user: user))
          end
          create_simplybook_provider(profile) if profile.simplybook_unit_id.blank?
          render json: EmployeeProfileSerializer.render_as_hash(profile), status: :created
        end

        def update
          profile = find_profile
          ActiveRecord::Base.transaction do
            profile.user.update!(user_params) if user_fields_present?
            profile.update!(employee_params)
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

        # Best-effort: create this tech as a provider in SimplyBook and store the
        # returned id on the profile. Creating a provider is a pure admin-API
        # write — no email verification. Never fails staff creation if SimplyBook
        # is down/unconfigured; the admin can still type a unit id later.
        def create_simplybook_provider(profile)
          return if ENV["SIMPLYBOOK_COMPANY"].blank?

          user = profile.user
          name = [ user.first_name, user.last_name ].compact_blank.join(" ").presence || user.email
          service_ids = profile.services.map(&:simplybook_event_id).compact
          id = SimplyBook::Client.new.create_provider(
            name: name, email: user.email, phone: user.phone, service_ids: service_ids
          )
          profile.update_columns(simplybook_unit_id: id) if id.present?
        rescue StandardError => e
          Rails.logger.warn("[Admin::EmployeesController] SimplyBook provider create failed for #{profile.id}: #{e.message}")
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
            :simplybook_unit_id, :traccar_device_id,
            :base_latitude, :base_longitude,
            :on_shift, :dispatchable, :active, :partner_id,
            service_fsas: []
          )
        end
      end
    end
  end
end
