module Api
  module V1
    module Super
      # Every franchise side by side for a month, each in its own currency (no
      # conversion): bookings, money received, customers, staff, royalty.
      class AnalyticsController < BaseController
        def show
          month = (Date.iso8601("#{params[:month]}-01") rescue Date.current).beginning_of_month
          rows = Franchise.order(is_default: :desc, name: :asc).map { |f| Current.set(franchise: f) { row(f, month) } }
          render json: { month: month.strftime("%Y-%m"), franchises: rows }
        end

        private

        def row(franchise, month)
          range = franchise.zone.local(month.year, month.month, 1)..franchise.zone.local(month.year, month.month, 1).end_of_month
          bookings = Booking.where(starts_at: range)
          received = Payment.where(status: "paid", paid_at: range, payable_type: "Booking", payable_id: Booking.select(:id)).sum(:amount)
          {
            id: franchise.id, name: franchise.name, slug: franchise.slug, status: franchise.status, currency: franchise.currency,
            bookings: bookings.count, completed: bookings.where(status: "completed").count,
            cancelled: bookings.where(status: "cancelled").count,
            booked_value: bookings.where.not(status: %w[cancelled missed]).sum(:total).to_d,
            received: received.to_d, customers: bookings.distinct.count(:user_id),
            technicians: EmployeeProfile.active.count,
            royalty_pct: franchise.royalty_pct, royalty_estimate: (received.to_d * franchise.royalty_pct / 100).round(2)
          }
        end
      end
    end
  end
end
