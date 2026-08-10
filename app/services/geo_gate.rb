require "ipaddr"

# Country-level gate: we only accept booking / consultation requests from Canada.
#
# Country is resolved from a trusted CDN edge header first (Cloudflare's
# CF-IPCountry, or CloudFront-Viewer-Country) — the reliable, no-external-call
# way to know a visitor's country in production. If no edge header is present
# (e.g. no CDN in front), an optional Geocoder IP lookup is used when
# GEO_IP_FALLBACK=true. Local/private IPs are always allowed (dev).
#
# ENV:
#   GEO_RESTRICT     default "true"  — master switch
#   GEO_STRICT       default "false" — when country is undetermined, block (fail-closed)
#   GEO_IP_FALLBACK  default "false" — use Geocoder IP lookup when no edge header
module GeoGate
  ALLOWED_COUNTRIES = %w[CA].freeze
  # Rack normalises request headers to HTTP_* env keys.
  CDN_COUNTRY_HEADERS = %w[
    HTTP_CF_IPCOUNTRY
    HTTP_CLOUDFRONT_VIEWER_COUNTRY
    HTTP_X_COUNTRY
  ].freeze

  module_function

  def allowed?(request)
    return true unless enabled?
    return true if local?(request.remote_ip)

    country = country_for(request)
    return !strict? if country.blank? # fail-open unless GEO_STRICT
    ALLOWED_COUNTRIES.include?(country)
  end

  # ISO-3166 alpha-2 (e.g. "CA"), or nil if undetermined.
  def country_for(request)
    from_cdn(request) || (ip_fallback? ? from_ip(request.remote_ip) : nil)
  end

  def from_cdn(request)
    CDN_COUNTRY_HEADERS.each do |key|
      code = request.get_header(key).to_s.strip.upcase
      return code if code.length == 2 && code != "XX" # XX = unknown/anonymised
    end
    nil
  end

  def from_ip(ip)
    return nil if ip.blank? || local?(ip)

    Geocoder.search(ip).first&.country_code&.upcase.presence
  rescue StandardError => e
    Rails.logger.warn("[GeoGate] IP lookup failed for #{ip}: #{e.message}")
    nil
  end

  def local?(ip)
    return true if ip.blank?

    addr = IPAddr.new(ip.to_s.split("%").first)
    addr.loopback? || addr.private? || addr.link_local?
  rescue IPAddr::Error
    false
  end

  def enabled? = ActiveModel::Type::Boolean.new.cast(ENV.fetch("GEO_RESTRICT", "true"))
  def strict?  = ActiveModel::Type::Boolean.new.cast(ENV.fetch("GEO_STRICT", "false"))
  def ip_fallback? = ActiveModel::Type::Boolean.new.cast(ENV.fetch("GEO_IP_FALLBACK", "false"))
end
