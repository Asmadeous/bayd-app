# Payment webhooks carry no login: the franchise comes from the URL each
# franchise registers with its provider (/webhooks/<provider>/<slug>); the
# original URL without a slug is the default franchise's. Its keys verify the
# signature and its records are the ones settled.
module WebhookFranchise
  extend ActiveSupport::Concern

  included do
    skip_before_action :authenticate_user!
    skip_before_action :set_current_franchise
    before_action :set_webhook_franchise
  end

  private

  def set_webhook_franchise
    Current.franchise = params[:franchise].present? ? Franchise.find_by!(slug: params[:franchise]) : Franchise.default
  end
end
