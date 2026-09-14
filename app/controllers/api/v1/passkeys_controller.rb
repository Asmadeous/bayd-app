module Api
  module V1
    # Passkeys / WebAuthn (optional MFA / passwordless). Any authenticated user can
    # register a passkey; anyone can then authenticate with it. Registration
    # requires an existing session (you add a passkey to your own account);
    # authentication is public and returns a JWT like the other login paths.
    #
    # This is a stateless JWT API, so the WebAuthn challenge is stored server-side
    # (WebauthnChallenge) between the options request and the verify, not in a
    # cookie session.
    class PasskeysController < ApplicationController
      skip_before_action :authenticate_user!, only: %i[authentication_options authenticate]

      # --- Registration (must be logged in) ---

      def registration_options
        options = WebAuthn::Credential.options_for_create(
          user: { id: current_user.webauthn_id, name: current_user.email || current_user.phone || "user" },
          exclude: current_user.webauthn_credentials.pluck(:webauthn_id),
          authenticator_selection: { user_verification: "required" }
        )
        WebauthnChallenge.issue!(current_user, "registration", options.challenge)
        render json: options
      end

      def register
        challenge = WebauthnChallenge.consume!(current_user, "registration")
        return render(json: { error: "No pending registration. Start again." }, status: :unprocessable_entity) unless challenge

        webauthn_credential = WebAuthn::Credential.from_create(credential_param)
        webauthn_credential.verify(challenge, user_verification: true)

        current_user.webauthn_credentials.create!(
          webauthn_id: webauthn_credential.id,
          public_key: webauthn_credential.public_key,
          sign_count: webauthn_credential.sign_count,
          nickname: params[:nickname].presence
        )
        render json: { status: "registered" }, status: :created
      rescue WebAuthn::Error => e
        render json: { error: "Passkey registration failed: #{e.message}" }, status: :unprocessable_entity
      end

      # --- Authentication (public) ---

      def authentication_options
        user = find_user_by_identifier
        # Don't reveal whether the account exists: return options either way, but
        # only a real user with credentials gets a usable allow-list + challenge.
        allow = user&.webauthn_credentials&.pluck(:webauthn_id) || []
        options = WebAuthn::Credential.options_for_get(allow: allow, user_verification: "required")
        WebauthnChallenge.issue!(user, "authentication", options.challenge) if user
        render json: options
      end

      def authenticate
        user = find_user_by_identifier
        challenge = user && WebauthnChallenge.consume!(user, "authentication")
        return render(json: { error: "That passkey sign-in is invalid or expired." }, status: :unauthorized) unless challenge

        webauthn_credential = WebAuthn::Credential.from_get(credential_param)
        stored = user.webauthn_credentials.find_by(webauthn_id: webauthn_credential.id)
        return render(json: { error: "Unknown passkey." }, status: :unauthorized) unless stored

        webauthn_credential.verify(
          challenge,
          public_key: stored.public_key,
          sign_count: stored.sign_count,
          user_verification: true
        )
        stored.update!(sign_count: webauthn_credential.sign_count)

        render json: { token: generate_token(user), user: UserSerializer.render_as_hash(user) }
      rescue WebAuthn::Error => e
        render json: { error: "Passkey sign-in failed: #{e.message}" }, status: :unauthorized
      end

      private

      # The browser/app sends a PublicKeyCredential (WebAuthn spec shape). Permit
      # its exact keys — the WebAuthn library then validates structure + crypto.
      # Not mass-assigned to any model; it's passed to WebAuthn::Credential.
      def credential_param
        params.require(:credential).permit(
          :id, :rawId, :type, :authenticatorAttachment,
          response: [ :clientDataJSON, :attestationObject, :authenticatorData, :signature, :userHandle ],
          clientExtensionResults: {}
        ).to_h
      end

      def find_user_by_identifier
        id = params[:email].presence || params[:phone].presence
        return nil if id.blank?

        if id.include?("@")
          User.find_by("LOWER(email) = ?", id.downcase)
        else
          User.find_by(phone: PhoneVerification.normalize(id))
        end
      end
    end
  end
end
