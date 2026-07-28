# Detailed performance KPIs for a single technician over a period.
class EmployeeAnalytics
  def initialize(employee_profile, period: nil)
    @ep = employee_profile
    @period = AnalyticsPeriod.normalize(period)
    @range_start = AnalyticsPeriod.start_for(@period)
  end

  def as_json(*)
    {
      employee: employee_info,
      period: @period,
      range: { start: @range_start, end: Time.current },
      summary: summary,
      rating_breakdown: rating_breakdown,
      revenue_trend: revenue_trend,
      top_services: top_services,
      recent_reviews: recent_reviews,
      upcoming: upcoming
    }
  end

  private

  def employee_info
    {
      id: @ep.id,
      name: [ @ep.user&.first_name, @ep.user&.last_name ].compact.join(" ").strip.presence || "Technician ##{@ep.id}",
      title: @ep.title,
      photo_url: @ep.photo_url
    }
  end

  def bookings
    scope = @ep.bookings
    scope = scope.where("starts_at >= ?", @range_start) if @range_start
    scope
  end

  def completed = bookings.where(status: "completed")

  def reviews = Review.approved.where(employee_profile_id: @ep.id)

  def summary
    completed_count = completed.count
    cancellations = bookings.where(status: "cancelled").count
    no_shows = bookings.where(status: "no_show").count
    finished = completed_count + cancellations + no_shows

    {
      completed_bookings: completed_count,
      revenue: completed.sum(:total).to_f.round(2),
      average_rating: reviews.average(:rating)&.to_f&.round(2),
      reviews_count: reviews.count,
      cancellations: cancellations,
      no_shows: no_shows,
      completion_rate: finished.zero? ? nil : (completed_count.to_f / finished).round(3),
      upcoming_count: @ep.bookings.where(status: "confirmed").where("starts_at > ?", Time.current).count
    }
  end

  def rating_breakdown
    counts = reviews.group(:rating).count
    (1..5).index_with { |star| counts[star].to_i }
  end

  def revenue_trend
    completed.group("DATE(starts_at)").sum(:total)
             .sort_by { |date, _| date }
             .map { |date, total| { date: date.to_s, revenue: total.to_f.round(2) } }
  end

  def top_services
    count_by = completed.group(:service_id).count
    rev_by   = completed.group(:service_id).sum(:total)
    services = Service.where(id: count_by.keys).index_by(&:id)

    count_by.map do |service_id, count|
      {
        name: services[service_id]&.name || "Service ##{service_id}",
        bookings: count,
        revenue: rev_by[service_id].to_f.round(2)
      }
    end.sort_by { |s| -s[:revenue] }.first(8)
  end

  def recent_reviews
    PublicReviewSerializer.render_as_hash(
      reviews.includes(:user).order(created_at: :desc).limit(8)
    )
  end

  def upcoming
    records = @ep.bookings.where(status: "confirmed")
                 .where("starts_at > ?", Time.current)
                 .includes(:service, :user)
                 .order(:starts_at).limit(10)
    records.map do |b|
      {
        id: b.id,
        service_name: b.service&.name,
        client_name: [ b.user&.first_name, b.user&.last_name ].compact.join(" ").strip.presence || "Client",
        starts_at: b.starts_at,
        total: b.total.to_f.round(2)
      }
    end
  end
end
