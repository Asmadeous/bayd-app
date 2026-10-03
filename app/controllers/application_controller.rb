class ApplicationController < ActionController::API
  before_action :authenticate_user!
  before_action :set_current_franchise

  rescue_from ActiveRecord::RecordNotFound,       with: :not_found
  rescue_from ActiveRecord::RecordInvalid,        with: :unprocessable
  rescue_from ActionController::ParameterMissing, with: :bad_request
  # A no_double_booking exclusion violation means the slot was taken between the
  # availability check and the write — a clean "slot unavailable" (422), never a
  # 500. Any OTHER StatementInvalid is a real DB error: re-raise so it 500s and
  # reaches Sentry.
  rescue_from ActiveRecord::StatementInvalid,     with: :handle_statement_invalid

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
    # A deleted account's unexpired tokens must stop working too.
    @current_user = User.where(deleted_at: nil).find(payload["sub"])
  rescue JWT::DecodeError, ActiveRecord::RecordNotFound
    unauthorized
  end

  attr_reader :current_user

  # Which franchise this request works in. Staff and franchise admins are always
  # in their own; a super admin picks one with X-Franchise (none = every
  # franchise, the global console); customers and visitors get the X-Franchise
  # they ask for, else the site they're on (Origin), else the default.
  def set_current_franchise
    user = current_user || optional_current_user
    Current.franchise =
      if user&.super_admin?
        requested_franchise(live_only: false)
      elsif user && !user.customer? && user.franchise
        user.franchise
      else
        requested_franchise(live_only: true) || Franchise.for_host(origin_host) || Franchise.default
      end
  end

  def requested_franchise(live_only:)
    slug = request.headers["X-Franchise"].to_s.strip.downcase
    return if slug.blank?

    scope = live_only ? Franchise.status_live : Franchise.all
    scope.find_by(slug: slug)
  end

  def origin_host
    URI.parse(request.headers["Origin"].to_s).host
  rescue URI::InvalidURIError
    nil
  end

  # The signed-in user on a public endpoint, or nil. Never renders 401.
  def optional_current_user
    return @current_user if defined?(@current_user) && @current_user

    token = request.headers["Authorization"]&.split(" ")&.last
    return unless token

    payload = JWT.decode(token, jwt_secret, true, algorithm: "HS256").first
    @current_user = User.where(deleted_at: nil).find_by(id: payload["sub"])
  rescue JWT::DecodeError
    nil
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

  def require_super_admin!
    forbidden unless current_user&.super_admin?
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

  # Issue the app's login JWT for a user (shared by the auth + passkey logins).
  def generate_token(user)
    payload = { sub: user.id, role: user.role, exp: 30.days.from_now.to_i }
    JWT.encode(payload, jwt_secret, "HS256")
  end

  def not_found(e)     = render json: { error: e.message }, status: :not_found
  def unprocessable(e) = render json: { errors: e.record.errors.full_messages }, status: :unprocessable_entity
  def bad_request(e)   = render json: { error: e.message }, status: :bad_request
  def unauthorized     = render json: { error: "Unauthorized" }, status: :unauthorized
  def forbidden        = render json: { error: "Forbidden" }, status: :forbidden

  def handle_statement_invalid(e)
    raise e unless e.cause.is_a?(PG::ExclusionViolation) &&
                   e.cause.message.include?("no_double_booking")

    render json: {
      code:  "slot_taken",
      error: "That time was just booked. Please choose another slot."
    }, status: :unprocessable_entity
  end
end
