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

  def require_admin!
    forbidden unless current_user&.admin?
  end

  def require_employee!
    forbidden unless current_user&.employee? || current_user&.admin?
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
    Rails.application.credentials.secret_key_base || ENV.fetch("SECRET_KEY_BASE")
  end

  def not_found(e)     = render json: { error: e.message }, status: :not_found
  def unprocessable(e) = render json: { errors: e.record.errors.full_messages }, status: :unprocessable_entity
  def bad_request(e)   = render json: { error: e.message }, status: :bad_request
  def unauthorized     = render json: { error: "Unauthorized" }, status: :unauthorized
  def forbidden        = render json: { error: "Forbidden" }, status: :forbidden
end
