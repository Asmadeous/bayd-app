require "rails_helper"

# The newsletter: signing up sends a welcome email once, unsubscribing lands on
# the website (or answers a mail app's one-click POST), and admins write and
# send their own newsletters from the dashboard.
RSpec.describe "Newsletter", type: :request do
  let!(:admin) { create(:user, email: "admin@baydspa.ca", first_name: "Ada", role: :admin) }

  def auth_header(user)
    token = JWT.encode({ sub: user.id, role: user.role, exp: 30.days.from_now.to_i },
                       ENV["SECRET_KEY_BASE"].presence || Rails.application.secret_key_base, "HS256")
    { "Authorization" => "Bearer #{token}" }
  end

  describe "subscribing" do
    it "sends the welcome email to a new subscriber only once" do
      expect { post "/api/v1/newsletter/subscribe", params: { email: "Kim@Example.com" } }
        .to have_enqueued_mail(NewsletterMailer, :welcome)
      expect { post "/api/v1/newsletter/subscribe", params: { email: "kim@example.com" } }
        .not_to have_enqueued_mail(NewsletterMailer, :welcome)
    end

    it "welcomes someone back after they unsubscribed" do
      NewsletterSubscriber.create!(email: "kim@example.com", status: :unsubscribed)

      expect { post "/api/v1/newsletter/subscribe", params: { email: "kim@example.com" } }
        .to have_enqueued_mail(NewsletterMailer, :welcome)
    end
  end

  describe "unsubscribing" do
    let!(:subscriber) { NewsletterSubscriber.create!(email: "kim@example.com") }

    it "unsubscribes from the email link and shows the website's page" do
      get "/api/v1/newsletter/unsubscribe", params: { token: subscriber.unsubscribe_token }

      expect(response).to redirect_to(%r{/newsletter/unsubscribed\z})
      expect(subscriber.reload).to be_unsubscribed
    end

    it "answers a mail app's one-click unsubscribe" do
      post "/api/v1/newsletter/unsubscribe", params: { token: subscriber.unsubscribe_token }

      expect(response).to have_http_status(:ok)
      expect(subscriber.reload).to be_unsubscribed
    end

    it "sends an unknown link to the page's invalid state" do
      get "/api/v1/newsletter/unsubscribe", params: { token: "nope" }

      expect(response).to redirect_to(%r{/newsletter/unsubscribed\?invalid=1\z})
    end
  end

  describe "admin newsletters" do
    let(:params) { { newsletter_campaign: { subject: "Winter offers", body: "20% off pedicures this week." } } }

    before do
      NewsletterSubscriber.create!(email: "a@example.com")
      NewsletterSubscriber.create!(email: "b@example.com")
      NewsletterSubscriber.create!(email: "gone@example.com", status: :unsubscribed)
    end

    it "sends to every current subscriber and keeps the history" do
      post "/api/v1/admin/newsletter_campaigns", params: params, headers: auth_header(admin), as: :json

      expect(response).to have_http_status(:created)
      expect(response.parsed_body).to include("subject" => "Winter offers", "recipients_count" => 2, "sent_by" => "Ada")
      expect(NewsletterCampaignJob).to have_been_enqueued.with(NewsletterCampaign.last.id)

      get "/api/v1/admin/newsletter_campaigns", headers: auth_header(admin)
      expect(response.parsed_body).to include("subscriber_count" => 2)
      expect(response.parsed_body["data"].size).to eq(1)
    end

    it "emails each subscriber with an unsubscribe link and the mailing address" do
      Setting.set("invoice_business_address", "123 Queen St W, Toronto, ON M5H 2M9")
      campaign = NewsletterCampaign.create!(subject: "Winter offers", body: "20% off")
      mail = NewsletterMailer.campaign(campaign, NewsletterSubscriber.first)

      expect(mail.header["List-Unsubscribe"].to_s).to include("/newsletter/unsubscribe?token=")
      expect(mail.body.encoded).to include("20% off", "123 Queen St W", "Unsubscribe")
    end

    it "requires a subject and body" do
      post "/api/v1/admin/newsletter_campaigns/preview",
           params: { newsletter_campaign: { subject: "", body: "" } }, headers: auth_header(admin), as: :json

      expect(response).to have_http_status(:unprocessable_entity)
    end
  end
end
