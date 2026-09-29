# Customer <-> technician messaging is open any time, as long as the two have
# at least one booking together (past, upcoming or cancelled). It stops a
# customer and a technician who've never been booked together from messaging
# out of the blue. Everyone else (admins, support, staff to staff) is unaffected.
class ContactWindow
  # nil when the two may message; otherwise the reason to show the sender.
  def self.blocked_reason(sender, recipient)
    customer, staff = customer_and_staff(sender, recipient)
    return unless customer

    profile = staff.employee_profile
    return if profile && Booking.where(user: customer, employee_profile: profile).exists?

    other = sender == customer ? "technicians" : "clients"
    "You can only message #{other} you've had a booking with."
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
