module Api
  module V1
    module Admin
      # Aggregated KPI / performance metrics for the admin dashboard.
      class AnalyticsController < BaseController
        PERIODS = {
          "7d"  => -> { 7.days.ago },
          "30d" => -> { 30.days.ago },
          "90d" => -> { 90.days.ago },
          "ytd" => -> { Time.current.beginning_of_year },
          "all" => -> { nil }
        }.freeze

        def show
          render json: {
            period: period_key,
            range:  { start: range_start, end: Time.current },
            summary: summary,
            invoices: invoices_summary,
            employees: employee_leaderboard,
            revenue_trend: revenue_trend,
            top_services: top_services
          }
        end

        private

        def period_key
          PERIODS.key?(params[:period]) ? params[:period] : "30d"
        end

        def range_start
          @range_start ||= PERIODS.fetch(period_key).call
        end

        # Completed bookings within the selected window (by service date).
        def completed_bookings
          @completed_bookings ||= begin
            scope = Booking.where(status: "completed")
            scope = scope.where("starts_at >= ?", range_start) if range_start
            scope
          end
        end

        # All bookings in window — used for completion-rate denominators.
        def all_bookings
          scope = Booking.all
          scope = scope.where("starts_at >= ?", range_start) if range_start
          scope
        end

        def paid_orders
          scope = Order.where(status: %w[paid shipped])
          scope = scope.where("created_at >= ?", range_start) if range_start
          scope
        end

        def summary
          finished = all_bookings.where(status: %w[completed cancelled no_show]).count
          completed = completed_bookings.count
          service_revenue = completed_bookings.sum(:total).to_f
          product_revenue = paid_orders.sum(:total).to_f

          {
            service_revenue: service_revenue.round(2),
            product_revenue: product_revenue.round(2),
            total_revenue:   (service_revenue + product_revenue).round(2),
            completed_bookings: completed,
            new_customers: new_customers_count,
            average_rating: Review.approved.average(:rating)&.to_f&.round(2),
            completion_rate: finished.zero? ? nil : (completed.to_f / finished).round(3)
          }
        end

        def invoices_summary
          scope = Invoice.where(status: %w[issued paid])
          scope = scope.where("issued_at >= ?", range_start) if range_start
          {
            count: scope.count,
            total_invoiced: scope.sum(:total).to_f.round(2),
            tax_collected: scope.sum(:tax).to_f.round(2),
            by_kind: scope.group(:kind).sum(:total).transform_values { |v| v.to_f.round(2) }
          }
        end

        def new_customers_count
          scope = User.where(role: "customer")
          scope = scope.where("created_at >= ?", range_start) if range_start
          scope.count
        end

        def employee_leaderboard
          revenue_by_emp = completed_bookings.group(:employee_profile_id).sum(:total)
          count_by_emp   = completed_bookings.group(:employee_profile_id).count
          cancels_by_emp = all_bookings.where(status: %w[cancelled no_show]).group(:employee_profile_id).count
          rating_by_emp  = Review.approved.group(:employee_profile_id).average(:rating)

          ids = (revenue_by_emp.keys + count_by_emp.keys).uniq.compact
          profiles = EmployeeProfile.where(id: ids).includes(:user).index_by(&:id)

          ids.map do |id|
            ep = profiles[id]
            {
              id: id,
              name: ep ? [ ep.user&.first_name, ep.user&.last_name ].compact.join(" ").strip.presence || "Technician ##{id}" : "Technician ##{id}",
              title: ep&.title,
              bookings_completed: count_by_emp[id].to_i,
              revenue: revenue_by_emp[id].to_f.round(2),
              cancellations: cancels_by_emp[id].to_i,
              average_rating: rating_by_emp[id]&.to_f&.round(2)
            }
          end.sort_by { |e| -e[:revenue] }
        end

        def revenue_trend
          rows = completed_bookings.group("DATE(starts_at)").sum(:total)
          rows.sort_by { |date, _| date }.map do |date, total|
            { date: date.to_s, revenue: total.to_f.round(2) }
          end
        end

        def top_services
          count_by_service = completed_bookings.group(:service_id).count
          rev_by_service   = completed_bookings.group(:service_id).sum(:total)
          services = Service.where(id: count_by_service.keys).index_by(&:id)

          count_by_service.map do |service_id, count|
            {
              name: services[service_id]&.name || "Service ##{service_id}",
              bookings: count,
              revenue: rev_by_service[service_id].to_f.round(2)
            }
          end.sort_by { |s| -s[:revenue] }.first(8)
        end
      end
    end
  end
end
