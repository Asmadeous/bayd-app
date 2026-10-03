# Franchise payment keys are stored with Active Record encryption. When no
# encryption keys are configured in credentials, derive them from
# secret_key_base so no new secret is needed at deploy. Changing
# secret_key_base would make stored keys unreadable (they'd be re-entered).
encryption = Rails.application.config.active_record.encryption
if encryption.primary_key.blank? && Rails.application.credentials.dig(:active_record_encryption, :primary_key).blank?
  generator = ActiveSupport::KeyGenerator.new(ENV["SECRET_KEY_BASE"].presence || Rails.application.secret_key_base,
                                              iterations: 1000)
  derive = ->(purpose) { generator.generate_key("active_record_encryption.#{purpose}", 32).unpack1("H*") }
  encryption.primary_key = derive.call("primary_key")
  encryption.deterministic_key = derive.call("deterministic_key")
  encryption.key_derivation_salt = derive.call("key_derivation_salt")
end
