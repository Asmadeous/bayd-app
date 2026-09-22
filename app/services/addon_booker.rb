# Resolves "service add-ons": extra services the customer wants done in the SAME
# visit, by the SAME technician, on top of the primary booking. We do NOT create
# a second booking for them — the admin/tech factors the extra work in on the
# day. Instead we:
#   • record the add-ons as a note on the primary booking (raw["addons"]),
#   • email the team the details (BookingRequestsController), and
#   • fold their price into the one combined charge (controller).
#
# Rules (per product decisions):
# - Add-ons are only the tech's OTHER performable services (employee_services).
# - Skip (don't fail the visit) an add-on the tech doesn't offer / that's gone;
#   report it. The primary still books.
class AddonBooker
  Result = Struct.new(:addons, :failures, keyword_init: true) do
    def total = addons.sum { |a| a[:price].to_d }
    def any?  = addons.any?
  end

  def initialize(primary_booking, addon_service_ids)
    @primary = primary_booking
    @service_ids = Array(addon_service_ids).map(&:to_i).uniq.reject { |id| id == primary_booking.service_id }
  end

  # Resolves the requested add-ons, persists them on the primary booking as a
  # note (raw["addons"]), and returns { addons: [ {id,name,price,duration} ], failures: [] }.
  def call
    addons   = []
    failures = []

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
      unless compatible_category?(service)
        failures << { service_id: sid, reason: "can't be combined with the main service" }
        next
      end

      addons << {
        id:       service.id,
        name:     service.name,
        price:    service.price_for(@primary.client_type),
        duration: service.duration_minutes
      }
    end

    persist(addons) if addons.any?
    Result.new(addons: addons, failures: failures)
  end

  private

  def tech_performs?(service)
    @primary.employee_profile.services.exists?(id: service.id)
  end

  # Lashes is a siloed category: the only tech who does lashes does ONLY lashes,
  # and no other tech does lashes. So a lash service and a non-lash service have
  # NO common tech — pairing them would leave the visit with no one who can do
  # both. Rule: lashes only combines with lashes, and non-lashes never combines
  # with lashes. (All other categories share a tech, so they mix.)
  # Belt-and-suspenders with tech_performs?, but explicit so the intent can't
  # silently regress if staffing changes.
  LASHES_SLUG = "lashes".freeze

  def compatible_category?(service)
    lashes?(service) == lashes?(@primary.service)
  end

  def lashes?(service)
    service.service_category&.slug == LASHES_SLUG
  end

  # Stamp the add-ons onto the primary booking AND fold their price into its
  # subtotal + total, so the money is correct everywhere (the combined charge,
  # outstanding_balance, and the invoice) regardless of pay-now vs pay-after.
  # Without the total bump, a pay-after booking with add-ons would never bill the
  # add-on cost and would report a total short by that amount. Note-only for the
  # scheduling side - no child bookings.
  #
  # Re-run safe: we subtract the PREVIOUS add-on total (from the existing note)
  # before adding the new one, so re-resolving the same booking replaces rather
  # than stacks the add-on cost.
  def persist(addons)
    previous_total = Array(@primary.raw["addons"]).sum { |a| a["price"].to_d }
    new_total      = addons.sum { |a| a[:price].to_d }
    delta          = new_total - previous_total
    @primary.update_columns(
      raw:      @primary.raw.merge("addons" => addons.map { |a| a.transform_keys(&:to_s) }),
      subtotal: @primary.subtotal.to_d + delta,
      total:    @primary.total.to_d + delta
    )
  end
end
