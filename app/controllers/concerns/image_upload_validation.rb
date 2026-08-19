# Byte-sniffs an uploaded file to confirm it's actually a real image, ignoring
# extension/declared content type entirely — Marcel::MimeType.for falls back
# to the FILENAME extension whenever byte-detection is ambiguous, so passing
# `name:` would let a renamed non-image (e.g. a text file saved as evil.png)
# pass as image/png. Omitting `name:` forces pure content-based detection.
module ImageUploadValidation
  extend ActiveSupport::Concern

  ALLOWED_IMAGE_TYPES = %w[image/jpeg image/png image/webp image/gif].freeze

  def valid_image?(file)
    return false unless file.respond_to?(:tempfile)

    ALLOWED_IMAGE_TYPES.include?(Marcel::MimeType.for(file.tempfile))
  end
end
