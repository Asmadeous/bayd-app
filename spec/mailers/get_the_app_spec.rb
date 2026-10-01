require "rails_helper"

# Customer emails only point to the app stores once a listing is live.
RSpec.describe "Get the app block in customer emails" do
  let(:user) { create(:user, email: "ana@example.com", first_name: "Ana") }
  let(:notification) { user.notifications.create!(kind: :review_request, title: "How was your visit?", body: "Tell us") }

  it "is left out while the apps aren't live" do
    stub_const("AppLinks::APP_STORE", { live: false, url: "https://apps.apple.com/app/id6812065322" })
    stub_const("AppLinks::GOOGLE_PLAY", { live: false, url: "https://play.google.com/store/apps/details?id=ca.baydspa.customer" })
    mail = CustomerMailer.notify(notification)

    expect(mail.text_part.body.to_s).not_to include("apps.apple.com")
  end

  it "links the live store" do
    stub_const("AppLinks::APP_STORE", { live: true, url: "https://apps.apple.com/app/id6812065322" })
    stub_const("AppLinks::GOOGLE_PLAY", { live: false, url: "https://play.google.com/store/apps/details?id=ca.baydspa.customer" })
    mail = CustomerMailer.notify(notification)

    expect(mail.html_part.body.to_s).to include("https://apps.apple.com/app/id6812065322")
    expect(mail.text_part.body.to_s).to include("iPhone: https://apps.apple.com/app/id6812065322")
    expect(mail.text_part.body.to_s).not_to include("Android:")
  end
end
