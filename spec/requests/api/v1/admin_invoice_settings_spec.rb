require "rails_helper"

RSpec.describe "Admin invoice business settings", type: :request do
  let(:admin) { create(:user, role: :admin) }

  def auth_header(user)
    token = JWT.encode({ sub: user.id, role: user.role, exp: 30.days.from_now.to_i },
                       ENV["SECRET_KEY_BASE"].presence || Rails.application.secret_key_base, "HS256")
    { "Authorization" => "Bearer #{token}" }
  end

  it "saves the GST/HST number and business address, and can clear them" do
    patch "/api/v1/admin/settings", params: { invoice_hst_number: " 123456789 RT0001 ", invoice_business_address: "1 Main St, Toronto" },
                                    headers: auth_header(admin), as: :json
    expect(response.parsed_body).to include("invoice_hst_number" => "123456789 RT0001", "invoice_business_address" => "1 Main St, Toronto")

    patch "/api/v1/admin/settings", params: { invoice_hst_number: "" }, headers: auth_header(admin), as: :json
    expect(response.parsed_body["invoice_hst_number"]).to eq("")
    expect(Setting.get("invoice_hst_number")).to be_blank
  end

  it "still ignores a blank numeric setting" do
    patch "/api/v1/admin/settings", params: { no_show_fee: "" }, headers: auth_header(admin), as: :json
    expect(response.parsed_body["no_show_fee"]).to eq("0")
  end
end
