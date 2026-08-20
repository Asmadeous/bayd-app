# Books "service add-ons": extra services the SAME technician performs, added to
# a primary booking and run back-to-back in one visit. Each add-on becomes its
# own child Booking (parent_booking_id → primary), starting where the previous
# one ends. The whole visit is pushed to SimplyBook as one is_sequential batch
# (consecutive services), reusing the batch plumbing.
#
# Rules (per product decisions):
# - Add-ons are only the tech's OTHER performable services (employee_services).
# - No "must finish before closing" gate — book back-to-back regardless; the tech
#   decides on the day. The DB no_double_booking constraint still applies (the
#   tech can't already have a DIFFERENT appointment in that consecutive slot).
# - Skip (don't fail the visit) an add-on the tech doesn't offer or that clashes;
#   report it. The primary + fitting add-ons still book.
class AddonBooker
  Result = Struct.new(:addons, :failures, keyword_init: true)

  def initialize(primary_booking, addon_service_ids)
    @primary = primary_booking
    @service_ids = Array(addon_service_ids).map(&:to_i).uniq.reject { |id| id == primary_booking.service_id }
  end

  def call
    addons   = []
    failures = []
    cursor   = @primary.ends_at

    @service_ids.each do |sid|
      service = Service.active.find_by(id: sid)
      unless service
        failures << { service_id: sid, reason: "unavailable" }
        next
      end
      unless tech_performs?(service)
        failures << { service_id: sid, reason: "not offered by this technician" }
        next
      end

      child = build_child(service, starts_at: cursor)
      begin
        child.save!
      rescue ActiveRecord::RecordNotUnique, ActiveRecord::StatementInvalid => e
        raise unless e.is_a?(ActiveRecord::RecordNotUnique) || e.cause.is_a?(PG::ExclusionViolation)
        failures << { service_id: sid, reason: "the technician is already booked for that time" }
        next
      end

      addons << child
      cursor = child.ends_at
    end

    push_visit_to_simplybook([ @primary, *addons ]) if addons.any?
    Result.new(addons: addons, failures: failures)
  end

  private

  def tech_performs?(service)
    @primary.employee_profile.services.exists?(id: service.id)
  end

  def build_child(service, starts_at:)
    price = service.price_for(@primary.client_type)
    Booking.new(
      user:             @primary.user,
      employee_profile: @primary.employee_profile,
      partner_id:       @primary.partner_id,
      service:          service,
      parent_booking:   @primary,
      address:          @primary.address,
      client_type:      @primary.client_type,
      party_size:       1,
      status:           @primary.status,
      payment_timing:   @primary.payment_timing,
      starts_at:        starts_at,
      ends_at:          starts_at + service.duration_minutes.minutes,
      subtotal:         price,
      travel_fee:       0,
      total:            price,
      service_latitude:  @primary.service_latitude,
      service_longitude: @primary.service_longitude
    )
  end

  # Push the whole visit as ONE SimplyBook is_sequential batch: primary first
  # (creates the batch), each add-on chained by the returned batch_id. Best-
  # effort + dormant-safe — a SimplyBook failure never breaks the local bookings.
  def push_visit_to_simplybook(bookings)
    return if ENV["SIMPLYBOOK_COMPANY"].blank?
    return if bookings.any? { |b| b.service.simplybook_event_id.blank? || b.employee_profile.simplybook_unit_id.blank? }

    client   = SimplyBook::Client.new
    batch_id = nil
    bookings.each do |b|
      result = client.create_booking_result(
        service_id:    b.service.simplybook_event_id,
        unit_id:       b.employee_profile.simplybook_unit_id,
        starts_at:     b.starts_at,
        ends_at:       b.ends_at,
        client:        { name: b.user.first_name.presence || b.user.email, email: b.user.email, phone: b.user.phone },
        batch_id:      batch_id,
        is_sequential: true
      )
      batch_id ||= result[:batch_id]
      b.update_columns(simplybook_id: result[:id], simplybook_batch_id: batch_id, synced_at: Time.current) if result[:id].present?
    end
  rescue StandardError => e
    Rails.logger.warn("[AddonBooker] SimplyBook visit push failed for booking #{@primary.id}: #{e.message}")
  end
end
