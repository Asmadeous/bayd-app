require "rails_helper"

RSpec.describe NewsletterMailer do
  describe "#new_post" do
    let(:post) { create(:blog_post, status: "published", title: "Bridal Nails 101") }
    let(:subscriber) { create(:newsletter_subscriber) }
    let(:mail) { described_class.new_post(post, subscriber) }

    it "sends to the subscriber with the post title in the subject" do
      expect(mail.to).to eq([ subscriber.email ])
      expect(mail.subject).to eq("New on the blog: Bridal Nails 101")
    end

    it "includes a working unsubscribe link keyed to the subscriber's token" do
      expect(mail.html_part.body.to_s).to include(subscriber.unsubscribe_token)
      expect(mail.text_part.body.to_s).to include(subscriber.unsubscribe_token)
    end
  end
end
