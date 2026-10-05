module Api
  module V1
    # The signed-in user deletes their own account (App Store 5.1.1(v) and Google
    # Play). The preview lets the app show what will happen, or why it can't yet,
    # before the user confirms. AccountDeletion does the erasing.
    class AccountsController < ApplicationController
      CONFIRM_WORD = "DELETE".freeze

      def deletion_preview
        render json: {
          upcoming_bookings: upcoming_bookings.includes(:service).map { |b| preview_row(b) },
          blocked_reason: blocked_reason
        }
      end

      def destroy
        if (reason = blocked_reason)
          return render json: { error: reason }, status: :unprocessable_entity
        end
        unless params[:confirm].to_s.strip == CONFIRM_WORD
          return render json: { error: "Type #{CONFIRM_WORD} to confirm." }, status: :unprocessable_entity
        end

        cancelled = AccountDeletion.call(current_user)
        notify_admins_of_paid_cancellations(cancelled)
        render json: { deleted: true }
      end

      private

      def upcoming_bookings
        current_user.bookings.where(status: %w[pending confirmed]).where("starts_at > ?", Time.current).order(:starts_at)
      end

      def staff_upcoming_jobs
        current_user.employee_profile&.bookings&.where(status: %w[pending confirmed in_progress])
                    &.where("ends_at > ?", Time.current)&.count.to_i
      end

      def blocked_reason
        return "Ask another admin to remove your account." if current_user.admin?

        jobs = current_user.employee? ? staff_upcoming_jobs : 0
        "Ask the office to reassign your #{jobs} upcoming #{'job'.pluralize(jobs)} first." if jobs.positive?
      end

      def preview_row(booking)
        { id: booking.id, service: booking.service&.name, starts_at: booking.starts_at, paid: booking.amount_paid.positive? }
      end

      # Refunds are the office's call, so a paid booking cancelled by a deletion
      # goes to them rather than being refunded automatically.
      def notify_admins_of_paid_cancellations(bookings)
        paid = bookings.select { |b| b.amount_paid.positive? }
        return if paid.empty?

        lines = paid.map do |b|
          "##{b.id} #{b.service&.name} on #{b.starts_at.in_time_zone(BusinessHours.zone).strftime('%b %-d')} " \
            "(#{ActiveSupport::NumberHelper.number_to_currency(b.amount_paid)} paid)"
        end
        User.where(role: :admin, deleted_at: nil).find_each do |admin|
          NotificationService.deliver(
            user: admin, kind: :booking_cancelled,
            title: "A customer deleted their account",
            body: "Their paid upcoming bookings were cancelled; review refunds: #{lines.join('; ')}.",
            booking: paid.first,
            action_url: "#{ENV.fetch('APP_URL', 'http://localhost:3001')}/dashboard/admin/bookings"
          )
        end
      rescue StandardError => e
        Rails.logger.warn("[AccountsController] admin refund notice failed: #{e.message}")
      end
    end
  end
end
