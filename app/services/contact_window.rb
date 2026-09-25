# Customer <-> technician messaging is only open around a booking they share:
# from Booking::ACCESS_LEAD_MIN before it starts until it's completed or
# cancelled. Everyone else (admins, support, staff to staff) is unaffected.
class ContactWindow
  # nil when the two may message; otherwise the reason to show the sender.
  def self.blocked_reason(sender, recipient, at: Time.current)
    customer, staff = customer_and_staff(sender, recipient)
    return unless customer

    shared = Booking.where(user: customer, employee_profile: staff.employee_profile)
    return if staff.employee_profile && shared.access_open(at).exists?

    upcoming = shared.where(status: Booking::ACCESS_STATUSES).where("starts_at > ?", at).order(:starts_at).first
    other = sender == customer ? "your technician" : "your client"
    if upcoming
      "Your appointment window hasn't started yet. You can message #{other} from #{upcoming.access_opens_label} " \
        "(#{Booking::ACCESS_LEAD_MIN} minutes before the appointment)."
    else
      "Messaging with #{other} is only open from #{Booking::ACCESS_LEAD_MIN} minutes before an appointment until it's finished."
    end
  end

  def self.customer_and_staff(a, b)
    return if a.nil? || b.nil? || a.admin? || b.admin?

    staff = ->(u) { u.employee? || u.partner? }
    return [ a, b ] if a.customer? && staff.(b)
    return [ b, a ] if b.customer? && staff.(a)

    nil
  end
  private_class_method :customer_and_staff
end
