module Api
  module V1
    module Admin
      # Fuel-compensation report: staff shifts with travelled distance and the
      # reimbursement owed. Filterable by employee and date range.
      class ShiftsController < BaseController
        def index
          scope = filtered_scope
          records, meta = paginate(scope.recent.includes(employee_profile: :user))
          render json: {
            data: ShiftSerializer.render_as_hash(records),
            totals: totals(scope),
            pagination: meta
          }
        end

        def show
          shift = Shift.find(params[:id])
          render json: ShiftSerializer.render_as_hash(shift)
        end

        def destroy
          Shift.find(params[:id]).destroy!
          head :no_content
        end

        private

        def filtered_scope
          scope = Shift.all
          scope = scope.where(employee_profile_id: params[:employee_profile_id]) if params[:employee_profile_id].present?
          scope = scope.where(status: params[:status]) if params[:status].present?
          scope = scope.where(clock_in_at: Time.zone.parse(params[:from])..) if params[:from].present?
          scope = scope.where(clock_in_at: ..Time.zone.parse(params[:to]).end_of_day) if params[:to].present?
          scope
        end

        def totals(scope)
          late = scope.where(arrived_late: true).count
          on_time = scope.where(arrived_late: false).count
          {
            shifts: scope.count,
            distance_km: scope.sum(:distance_km).to_f.round(3),
            fuel_reimbursement: scope.sum(:fuel_reimbursement).to_f.round(2),
            late_arrivals: late,
            on_time_arrivals: on_time,
            on_time_rate: (scope.count.positive? ? (on_time.to_f / scope.count * 100).round(1) : nil)
          }
        end
      end
    end
  end
end
