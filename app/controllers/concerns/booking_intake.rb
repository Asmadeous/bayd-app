# Guest-friendly booking intake shared by booking requests and visits: the
# phone-only follow-up path and the inline address. Including controllers
# define `intake_params` (their nested params hash) and `intake_service_ids`.
module BookingIntake
  extend ActiveSupport::Concern

  private

  # A guest (not logged in) who supplied no email. Their booking can't be
  # booked online (it's email-keyed), so it becomes an admin follow-up instead.
  def guest_without_email?
    return false if current_user

    params.dig(:customer, :email).to_s.strip.blank?
  end

  # Phone-only guest booking → capture a CallbackRequest with EVERYTHING the
  # admin needs to book manually (date/time, address, party, notes all go in
  # the free-text notes since CallbackRequest has no columns for them), then
  # notify the team by email + in-app. Renders a follow-up status the
  # frontend uses to show "we'll call you to confirm".
  def create_follow_up_request
    cust = params[:customer] || {}
    cr = CallbackRequest.create!(
      service_id:    intake_service_ids.first.presence,
      postal_code:   params.dig(:address, :postal_code).presence || cust[:postal_code].presence,
      contact_name:  [ cust[:first_name], cust[:last_name] ].compact_blank.join(" ").presence,
      contact_phone: cust[:phone].presence,
      notes:         follow_up_notes,
      status:        "new"
    )
    notify_admin_follow_up(cr)
    render json: { status: "follow_up", callback_request_id: cr.id }, status: :created
  end

  # Everything the admin needs to book manually, formatted into one text
  # block (CallbackRequest has no date/time/address columns).
  def follow_up_notes
    br = intake_params
    ad = params[:address] || {}
    addr = [ ad[:line1], ad[:line2], ad[:city], ad[:province], ad[:postal_code] ].compact_blank.join(", ")
    lines = [
      "PHONE BOOKING — needs manual entry (no email given).",
      ("Service ID: #{intake_service_ids.join(', ')}" if intake_service_ids.any?),
      ("Requested: #{br[:requested_start] || br[:starts_at]}" if (br[:requested_start] || br[:starts_at]).present?),
      ("Client type: #{br[:client_type]}" if br[:client_type].present?),
      ("Party size: #{br[:party_size]}" if br[:party_size].to_i > 1),
      ("Address: #{addr}" if addr.present?),
      (("Apartment — buzz #{ad[:buzz_code]}") if ActiveModel::Type::Boolean.new.cast(ad[:is_apartment])),
      ("Customer notes: #{br[:notes]}" if br[:notes].present?)
    ].compact
    lines.join("\n")
  end

  # Best-effort admin notify: in-app Notification to every admin AND an email
  # to the team inbox. A failure here never breaks the customer's request.
  def notify_admin_follow_up(callback_request)
    title = "Phone booking follow-up — #{callback_request.contact_name.presence || callback_request.contact_phone}"
    body  = "A customer booked by phone (no email) and needs a callback to confirm + manual booking.\n#{callback_request.notes}"
    User.franchise_admins.find_each do |admin|
      Notification.create!(user: admin, kind: "booking_follow_up", title: title, body: body)
    end
    AdminMailer.booking_follow_up(callback_request).deliver_later
  rescue StandardError => e
    Rails.logger.warn("[BookingRequests] follow-up admin notify failed: #{e.message}")
  end

  # Location captured at booking, incl. apartment unit (line2) + buzz code.
  def build_address!(user)
    ap = params.require(:address).permit(
      :label, :line1, :line2, :city, :province, :postal_code,
      :latitude, :longitude, :is_apartment, :buzz_code
    )
    user.addresses.create!(ap.merge(default: user.addresses.none?))
  end
end
