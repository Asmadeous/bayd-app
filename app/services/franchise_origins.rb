# Web origins of live franchises (their subdomain or own domain), so a new
# franchise's site can call the API the moment it goes live, with no deploy.
# Cached briefly; read by CORS and the ActionCable origin check.
module FranchiseOrigins
  CACHE_KEY = "franchise_web_origins".freeze

  module_function

  def allowed?(origin)
    origin.present? && list.include?(origin.to_s.downcase)
  end

  def list
    Rails.cache.fetch(CACHE_KEY, expires_in: 5.minutes) { Franchise.status_live.flat_map(&:web_origins) }
  rescue ActiveRecord::ActiveRecordError
    []
  end

  def reset! = Rails.cache.delete(CACHE_KEY)
end
