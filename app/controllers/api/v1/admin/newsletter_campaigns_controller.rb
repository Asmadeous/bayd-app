module Api
  module V1
    module Admin
      # Newsletters written in the dashboard: a test send to the admin first,
      # then one send to every subscriber. Sent newsletters are kept as history.
      class NewsletterCampaignsController < BaseController
        def index
          records, meta = paginate(NewsletterCampaign.includes(:sent_by).order(created_at: :desc))
          render json: {
            data: records.map { |campaign| campaign_json(campaign) },
            subscriber_count: NewsletterSubscriber.subscribed.count,
            mailing_address: Setting.get("invoice_business_address"),
            pagination: meta
          }
        end

        def create
          campaign = NewsletterCampaign.create!(campaign_params.merge(sent_by: current_user))
          campaign.deliver!
          render json: campaign_json(campaign), status: :created
        end

        def preview
          campaign = NewsletterCampaign.new(campaign_params)
          return render(json: { error: campaign.errors.full_messages.to_sentence }, status: :unprocessable_entity) unless campaign.valid?

          NewsletterMailer.campaign_preview(campaign, current_user.email).deliver_now
          render json: { sent_to: current_user.email }
        end

        private

        def campaign_params
          params.require(:newsletter_campaign).permit(:subject, :body)
        end

        def campaign_json(campaign)
          {
            id: campaign.id,
            subject: campaign.subject,
            body: campaign.body,
            sent_at: campaign.sent_at,
            recipients_count: campaign.recipients_count,
            sent_by: campaign.sent_by&.first_name.presence || campaign.sent_by&.email
          }
        end
      end
    end
  end
end
