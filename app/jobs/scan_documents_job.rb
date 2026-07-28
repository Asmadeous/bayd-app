require "open3"
require "tempfile"

# Scans an application's uploaded documents with ClamAV. Documents stay
# quarantined (scan_status: pending, not downloadable) until this clears them.
# Infected files are purged immediately.
#
# Enabled in production by default; in dev/test it no-ops to "clean" unless
# CLAMAV_ENABLED=true. If the scanner is enabled but unavailable, the job raises
# (and is retried) so files are NEVER marked clean without a real scan.
class ScanDocumentsJob < ApplicationJob
  queue_as :default

  def perform(application_id)
    app = JobApplication.find_by(id: application_id)
    return unless app&.documents&.attached?

    unless clamav_enabled?
      app.update_column(:scan_status, "clean")
      return
    end

    if app.documents.any? { |doc| infected?(doc) }
      app.documents.purge
      app.update_column(:scan_status, "infected")
      Rails.logger.warn("[ScanDocumentsJob] infected upload purged for application #{app.id}")
    else
      app.update_column(:scan_status, "clean")
    end
  end

  private

  def infected?(document)
    Tempfile.create(%w[upload .pdf]) do |tmp|
      tmp.binmode
      tmp.write(document.download)
      tmp.flush

      _out, status = Open3.capture2e(scanner_bin, "--no-summary", tmp.path)
      case status.exitstatus
      when 0 then false # clean
      when 1 then true  # virus found
      else raise "ClamAV scan error (exit #{status.exitstatus})"
      end
    end
  end

  def scanner_bin
    ENV.fetch("CLAMAV_SCANNER", "clamscan")
  end

  def clamav_enabled?
    ActiveModel::Type::Boolean.new.cast(ENV.fetch("CLAMAV_ENABLED", Rails.env.production?.to_s))
  end
end
