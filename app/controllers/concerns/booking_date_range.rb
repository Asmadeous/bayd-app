# Calendar loading: `from` / `to` (YYYY-MM-DD, company zone, inclusive) narrow a
# booking list to one visible range and return it whole instead of paginated.
# Without both params the caller keeps its normal paginated list.
module BookingDateRange
  extend ActiveSupport::Concern

  MAX_RANGE_DAYS = 62

  class InvalidRange < StandardError; end

  included do
    rescue_from InvalidRange do |e|
      render json: { error: e.message }, status: :unprocessable_entity
    end
  end

  private

  def date_range_requested?
    params[:from].present? && params[:to].present?
  end

  # Bookings starting in [from 00:00, to+1 00:00) local time, oldest first.
  def within_date_range(scope)
    from, to = parse_date_range!
    zone = BusinessHours.zone
    scope.where(starts_at: zone.local(from.year, from.month, from.day)...zone.local(to.year, to.month, to.day) + 1.day)
         .reorder(:starts_at)
  end

  # [from, to] as Dates from params, or InvalidRange (rendered as 422).
  def parse_date_range!
    from = parse_range_date(params[:from])
    to   = parse_range_date(params[:to])
    raise InvalidRange, "`to` must be on or after `from`." if to < from
    raise InvalidRange, "Pick a range of #{MAX_RANGE_DAYS} days or less." if (to - from).to_i >= MAX_RANGE_DAYS

    [ from, to ]
  end

  def parse_range_date(raw)
    Date.iso8601(raw.to_s)
  rescue Date::Error
    raise InvalidRange, "Dates must be YYYY-MM-DD."
  end
end
