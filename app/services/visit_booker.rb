# Books a multi-service visit: one Booking per service, each with the tech the
# VisitPlanner picked, created together or not at all. If a tech's slot is taken
# between planning and the write (the no_double_booking constraint trips), that
# tech is excluded and the visit is re-planned, a few times at most.
class VisitBooker
  Result = Struct.new(:visit, :error, keyword_init: true) do
    def success? = visit.present?
  end

  MAX_ATTEMPTS = 5

  class LineTaken < StandardError
    attr_reader :employee_id

    def initialize(employee_id)
      @employee_id = employee_id
      super("slot taken for employee #{employee_id}")
    end
  end

  def initialize(user:, services:, starts_at:, address:, client_type: "adult", party_size: 1,
                 payment_timing: "pay_after", booked_for_name: nil, booked_for_phone: nil, notes: nil)
    @user = user
    @services = Array(services)
    @starts_at = starts_at
    @address = address
    @client_type = client_type.to_s.presence_in(Service::CLIENT_TYPES) || "adult"
    @party_size = @client_type == "group" ? party_size.to_i.clamp(2, Service::GROUP_SIZE) : 1
    @payment_timing = payment_timing.to_s.presence_in(%w[pay_upfront pay_after]) || "pay_after"
    @booked_for_name = booked_for_name.presence
    @booked_for_phone = booked_for_phone.presence
    @notes = notes.presence
  end

  def call
    return failure(:invalid) if @services.empty? || @starts_at.nil? || @address.nil?
    unless EmployeeProfile.covers?(@address.postal_code, latitude: @address.latitude, longitude: @address.longitude)
      return failure(:no_coverage)
    end
    return failure(:outside_hours) unless BusinessHours.open_for?(@starts_at, @starts_at + total_minutes.minutes)

    excluded = []
    MAX_ATTEMPTS.times do
      plan = planner.plan_at(@starts_at, exclude_employee_ids: excluded)
      return failure(excluded.empty? ? :no_availability : :slot_taken) unless plan

      visit = create!(plan)
      schedule_reminders(visit)
      return Result.new(visit: visit)
    rescue LineTaken => e
      excluded << e.employee_id
    end
    failure(:slot_taken)
  end

  private

  def total_minutes = @services.sum { |s| s.duration_minutes * @party_size }

  # Money due now (a group deposit, or the customer paying up front) holds every
  # line pending until it lands; Booking#refresh_payment_status! confirms them.
  def upfront? = @client_type == "group" || @payment_timing == "pay_upfront"

  def planner
    VisitPlanner.new(
      services: @services, date: @starts_at.in_time_zone(BusinessHours.zone).to_date,
      customer_lat: @address.latitude, customer_lng: @address.longitude,
      postal_code: @address.postal_code, party_size: @party_size, strict_coverage: true
    )
  end

  # A savepoint, so a constraint violation on one line rolls back only this
  # attempt and the retry can run on a clean connection.
  def create!(plan)
    ActiveRecord::Base.transaction(requires_new: true) do
      visit = Visit.create!(
        user: @user, address: @address, client_type: @client_type, party_size: @party_size,
        payment_timing: @payment_timing, booked_for_name: @booked_for_name,
        booked_for_phone: @booked_for_phone, notes: @notes,
        service_latitude: @address.latitude, service_longitude: @address.longitude,
        starts_at: plan.first.starts_at, ends_at: plan.last.ends_at
      )
      plan.each_with_index { |line, position| create_line!(visit, line, position) }
      visit
    end
  end

  def create_line!(visit, line, position)
    price = line.service.price_for(@client_type) * @party_size
    visit.bookings.create!(
      user: @user, employee_profile: line.employee, partner_id: line.employee.partner_id,
      service: line.service, address: @address, visit_position: position,
      client_type: @client_type, party_size: @party_size,
      status: upfront? ? "pending" : "confirmed", payment_timing: @payment_timing,
      starts_at: line.starts_at, ends_at: line.ends_at,
      subtotal: price, travel_fee: 0, total: price,
      booked_for_name: @booked_for_name, booked_for_phone: @booked_for_phone, notes: @notes,
      service_latitude: @address.latitude, service_longitude: @address.longitude
    )
  rescue ActiveRecord::StatementInvalid => e
    raise unless e.cause.is_a?(PG::ExclusionViolation)

    raise LineTaken.new(line.employee.id)
  end

  # Pending lines get theirs when payment confirms them.
  def schedule_reminders(visit)
    visit.bookings.each { |b| BookingReminders.schedule(b) if b.confirmed? }
  rescue StandardError => e
    Rails.logger.warn("[VisitBooker] reminder scheduling failed for visit #{visit.id}: #{e.message}")
  end

  def failure(code) = Result.new(error: code)
end
