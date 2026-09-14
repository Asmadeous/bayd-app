# A registered passkey / security key for a user. Stores what WebAuthn#verify
# needs: the credential id, its public key, and the signature counter (bumped on
# each use to detect cloned authenticators).
class WebauthnCredential < ApplicationRecord
  belongs_to :user

  validates :webauthn_id, :public_key, presence: true
  validates :webauthn_id, uniqueness: true
end
