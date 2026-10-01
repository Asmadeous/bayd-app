require "rails_helper"

# Admins review chat reports from the dashboard: the list, the reported
# conversation (which the regular chat API hides from non-participants), and
# marking a report reviewed.
RSpec.describe "Admin chat reports", type: :request do
  let(:alice) { create(:user, email: "alice@example.com", first_name: "Alice") }
  let(:bob)   { create(:user, email: "bob@baydspa.ca", first_name: "Bob", role: :employee) }
  let(:admin) { create(:user, email: "admin@baydspa.ca", first_name: "Ada", role: :admin) }
  let(:convo) { Conversation.between(alice, bob) }
  let!(:report) do
    convo.messages.create!(sender: bob, body: "first")
    convo.messages.create!(sender: alice, body: "second")
    convo.chat_reports.create!(reporter: alice, reported_user: bob, reason: "Spam or scam", details: "keeps selling")
  end

  def auth_header(user)
    token = JWT.encode({ sub: user.id, role: user.role, exp: 30.days.from_now.to_i },
                       ENV["SECRET_KEY_BASE"].presence || Rails.application.secret_key_base, "HS256")
    { "Authorization" => "Bearer #{token}" }
  end

  it "lists reports with both people and the open count" do
    get "/api/v1/admin/chat_reports", headers: auth_header(admin)

    expect(response).to have_http_status(:ok)
    body = response.parsed_body
    expect(body["open_count"]).to eq(1)
    expect(body["data"].first).to include("reason" => "Spam or scam", "status" => "open")
    expect(body["data"].first["reporter"]).to include("name" => "Alice Doe", "role" => "customer")
    expect(body["data"].first["reported_user"]).to include("name" => "Bob Doe", "role" => "employee")
  end

  it "shows the reported conversation oldest first" do
    get "/api/v1/admin/chat_reports/#{report.id}", headers: auth_header(admin)

    expect(response).to have_http_status(:ok)
    expect(response.parsed_body["messages"].map { |m| m["body"] }).to eq(%w[first second])
    expect(response.parsed_body["reports_against_user"]).to eq(1)
  end

  it "marks a report reviewed by the admin, and can reopen it" do
    patch "/api/v1/admin/chat_reports/#{report.id}", params: { status: "reviewed" }, headers: auth_header(admin), as: :json

    expect(response.parsed_body).to include("status" => "reviewed")
    expect(response.parsed_body["reviewed_by"]).to include("name" => "Ada Doe")
    expect(report.reload.reviewed_at).to be_present

    patch "/api/v1/admin/chat_reports/#{report.id}", params: { status: "open" }, headers: auth_header(admin), as: :json

    expect(report.reload).to have_attributes(status: "open", reviewed_by_id: nil, reviewed_at: nil)
  end

  it "is admin only" do
    get "/api/v1/admin/chat_reports", headers: auth_header(alice)

    expect(response).to have_http_status(:forbidden)
  end
end
