class ApplicationController < ActionController::API
  before_action :authenticate_user!

  rescue_from ActiveRecord::RecordNotFound,       with: :not_found
  rescue_from ActiveRecord::RecordInvalid,        with: :unprocessable
  rescue_from ActionController::ParameterMissing, with: :bad_request

  # Surface the request id in the (lograge) request log for correlation.
  def append_info_to_payload(payload)
    super
    payload[:request_id] = request.request_id
  end

  private

  def authenticate_user!
    token = request.headers["Authorization"]&.split(" ")&.last
    return unauthorized unless token

    payload = JWT.decode(token, jwt_secret, true, algorithm: "HS256").first
    @current_user = User.find(payload["sub"])
  rescue JWT::DecodeError, ActiveRecord::RecordNotFound
    unauthorized
  end

  attr_reader :current_user

  # We only accept booking / consultation requests from within Canada.
  def enforce_canada!
    return if GeoGate.allowed?(request)

    render json: {
      error:   "outside_country",
      message: "Beauty @ Your Door currently serves Canada only."
    }, status: :forbidden
  end

  # The one way a not-logged-in customer is resolved from public input:
  # find-or-create by email OR phone (passwordless, at least one required).
  # Used by public booking + checkout. `source` is a params hash (e.g.
  # params.require(:customer)).
  #
  # Email is the account's identity key when present (unique, used for
  # magic-link login) — an existing account is always matched by email first.
  # A phone-only booking looks up the most recent account with that phone
  # (phone isn't unique — numbers get shared/reassigned) and falls back to
  # creating a new phone-only account. A customer who later adds an email to a
  # phone-only account gains magic-link login; until then they have no way to
  # sign back in (staff can look their bookings up by phone).
  def find_or_create_customer(source)
    email = source[:email].to_s.downcase.strip
    phone = source[:phone].to_s.strip
    raise ActionController::ParameterMissing, :email_or_phone if email.blank? && phone.blank?

    user = if email.present?
      User.find_or_initialize_by(email: email)
    else
      User.where(phone: phone, role: :customer).order(created_at: :desc).first || User.new
    end
    user.role ||= :customer
    contact = source.permit(
      :first_name, :last_name, :phone, :marketing_opt_in,
      :avatar_url, :street_address, :city, :country, :postal_code, :special_needs
    ).to_h.compact_blank
    user.assign_attributes(contact) if contact.present?
    user.save!
    user
  end

  def require_admin!
    forbidden unless current_user&.admin?
  end

  # Partners are external providers that behave like employees: they reach the
  # same self-scoped employee endpoints (their own schedule/shifts/bookings).
  # They are NOT admins — require_admin! deliberately excludes them.
  def require_employee!
    forbidden unless current_user&.employee? || current_user&.admin? || current_user&.partner?
  end

  def paginate(scope, per: 25)
    page  = [ [ params[:page].to_i, 1 ].max, 1 ].max
    total = scope.count
    records = scope.limit(per).offset((page - 1) * per)
    meta = {
      current_page: page,
      per_page:     per,
      total_count:  total,
      total_pages:  (total.to_f / per).ceil,
      next_page:    (page * per < total ? page + 1 : nil)
    }
    [ records, meta ]
  end

  def jwt_secret
    ENV["SECRET_KEY_BASE"].presence || Rails.application.secret_key_base
  end

  def not_found(e)     = render json: { error: e.message }, status: :not_found
  def unprocessable(e) = render json: { errors: e.record.errors.full_messages }, status: :unprocessable_entity
  def bad_request(e)   = render json: { error: e.message }, status: :bad_request
  def unauthorized     = render json: { error: "Unauthorized" }, status: :unauthorized
  def forbidden        = render json: { error: "Forbidden" }, status: :forbidden
end
