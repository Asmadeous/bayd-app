require "rails_helper"

# Logged-in staff/admin changing their own password (current + new). Distinct
# from the emailed reset-token flow. Customers are passwordless and can't use it.
RSpec.describe "Change password", type: :request do
  def auth_header(user)
    token = JWT.encode({ sub: user.id, role: user.role, exp: 30.days.from_now.to_i },
                       ENV["SECRET_KEY_BASE"].presence || Rails.application.secret_key_base, "HS256")
    { "Authorization" => "Bearer #{token}" }
  end

  describe "POST /api/v1/auth/change_password" do
    let(:staff) { create(:user, email: "staff@baydspa.ca", role: :employee, password: "originalpass1") }

    it "changes the password with the correct current password" do
      post "/api/v1/auth/change_password",
           params: { current_password: "originalpass1", new_password: "brandnewpass2" },
           headers: auth_header(staff), as: :json

      expect(response).to have_http_status(:ok)
      expect(staff.reload.authenticate("brandnewpass2")).to be_truthy
    end

    it "rejects a wrong current password with 401 and leaves the password unchanged" do
      post "/api/v1/auth/change_password",
           params: { current_password: "wrongpass", new_password: "brandnewpass2" },
           headers: auth_header(staff), as: :json

      expect(response).to have_http_status(:unauthorized)
      expect(staff.reload.authenticate("originalpass1")).to be_truthy
    end

    it "rejects a too-short new password with 422" do
      post "/api/v1/auth/change_password",
           params: { current_password: "originalpass1", new_password: "short" },
           headers: auth_header(staff), as: :json

      expect(response).to have_http_status(:unprocessable_content)
      expect(staff.reload.authenticate("originalpass1")).to be_truthy
    end

    it "refuses a customer account (passwordless)" do
      customer = create(:user, email: "c@example.com", role: :customer)
      post "/api/v1/auth/change_password",
           params: { current_password: "anything", new_password: "brandnewpass2" },
           headers: auth_header(customer), as: :json

      expect(response).to have_http_status(:unprocessable_content)
    end

    it "requires authentication" do
      post "/api/v1/auth/change_password",
           params: { current_password: "originalpass1", new_password: "brandnewpass2" }, as: :json

      expect(response).to have_http_status(:unauthorized)
    end
  end
end
