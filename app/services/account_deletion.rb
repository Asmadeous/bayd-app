# Deletes an account the way the app stores require without destroying records
# the business must keep: personal data is erased and the user can never sign in
# again, while their bookings, payments, invoices and orders stay (anonymized)
# for tax and payout history. The user row itself is kept as the anchor those
# records point at.
class AccountDeletion
  CANCEL_REASON = "Account deleted".freeze

  # Returns the upcoming bookings that were cancelled.
  # Runs outside any one franchise: a customer's bookings, subscriptions and
  # cards may be spread across several.
  def self.call(user) = Current.set(franchise: nil) { new(user).call }

  def initialize(user)
    @user = user
  end

  def call
    cancelled = []
    cards = saved_cards

    ActiveRecord::Base.transaction do
      cancelled = cancel_upcoming_bookings
      @user.subscriptions.where.not(status: "cancelled").find_each(&:cancel!)
      anonymize_bookings
      destroy_personal_records
      erase_profile
    end

    cards.each do |franchise, card_id|
      Current.set(franchise: franchise) { SquareService.disable_card(card_id) }
    end
    cancelled
  end

  # Every franchise's saved card, to remove at the provider once the account is gone.
  def saved_cards
    cards = @user.payment_profiles.includes(:franchise).filter_map { |p| [ p.franchise, p.card_ref ] if p.card_ref.present? }
    legacy = @user.payment_profile(Franchise.default)
    cards << [ Franchise.default, legacy.card_ref ] if legacy&.new_record? && legacy.card_ref.present?
    cards
  end

  private

  def cancel_upcoming_bookings
    @user.bookings.where(status: %w[pending confirmed]).where("starts_at > ?", Time.current).map do |booking|
      booking.update!(status: :cancelled, cancellation_reason: CANCEL_REASON)
      booking
    end
  end

  def anonymize_bookings
    @user.bookings.update_all(
      booked_for_name: nil, booked_for_phone: nil, notes: nil,
      service_latitude: nil, service_longitude: nil, address_id: nil
    )
  end

  def destroy_personal_records
    Subscription.where(user: @user).update_all(address_id: nil)
    @user.addresses.destroy_all
    @user.device_tokens.destroy_all
    @user.web_push_subscriptions.destroy_all
    @user.webauthn_credentials.destroy_all
    @user.magic_link_tokens.destroy_all
    @user.notifications.destroy_all
    @user.sent_messages.destroy_all
    NewsletterSubscriber.where(user: @user).destroy_all
    LoyaltyAccount.where(user: @user).destroy_all
    @user.payment_profiles.destroy_all
    @user.avatar.purge_later if @user.avatar.attached?
  end

  # update_columns on purpose: the anonymized row can't satisfy the live-account
  # validations (staff email domain, email-or-phone) and must not try to.
  def erase_profile
    @user.update_columns(
      first_name: nil, last_name: nil, email: "deleted-#{@user.id}@deleted.invalid", phone: nil,
      password_digest: nil, street_address: nil, city: nil, postal_code: nil, avatar_url: nil,
      google_uid: nil, webauthn_id: nil, referral_code: nil, marketing_opt_in: false, special_needs: false,
      square_card_id: nil, card_brand: nil, card_last4: nil, helcim_card_token: nil, moneris_data_key: nil,
      deleted_at: Time.current, updated_at: Time.current
    )
    @user.employee_profile&.update_columns(active: false, dispatchable: false, on_shift: false)
  end
end
