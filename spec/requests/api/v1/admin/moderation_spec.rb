require "rails_helper"

# Dashboard moderation that had API routes but no working endpoint or screen:
# blog comments wait for approval, and contact messages get a status.
RSpec.describe "Admin moderation", type: :request do
  let(:admin) { create(:user, email: "admin@baydspa.ca", role: :admin) }
  let(:post_record) { create(:blog_post, title: "Winter nails", status: "published") }

  def auth_header(user)
    token = JWT.encode({ sub: user.id, role: user.role, exp: 30.days.from_now.to_i },
                       ENV["SECRET_KEY_BASE"].presence || Rails.application.secret_key_base, "HS256")
    { "Authorization" => "Bearer #{token}" }
  end

  describe "blog comments" do
    let!(:pending)  { post_record.blog_comments.create!(body: "Love this", author_name: "Kim") }
    let!(:approved) { post_record.blog_comments.create!(body: "Great", author_name: "Lee", approved: true) }

    it "lists pending comments across posts with the post they belong to" do
      get "/api/v1/admin/blog_comments", params: { approved: false }, headers: auth_header(admin)

      expect(response).to have_http_status(:ok)
      expect(response.parsed_body["pending_count"]).to eq(1)
      expect(response.parsed_body["data"].map { |c| c["id"] }).to eq([ pending.id ])
      expect(response.parsed_body["data"].first["post"]).to include("title" => "Winter nails")
    end

    it "approves a comment so it shows publicly" do
      post "/api/v1/admin/blog_comments/#{pending.id}/approve", headers: auth_header(admin)

      expect(response).to have_http_status(:ok)
      get "/api/v1/blog_posts/#{post_record.slug}/blog_comments"
      expect(response.parsed_body["data"].map { |c| c["body"] }).to contain_exactly("Love this", "Great")
    end

    it "deletes a comment" do
      expect { delete "/api/v1/admin/blog_comments/#{pending.id}", headers: auth_header(admin) }
        .to change(BlogComment, :count).by(-1)
    end

    it "also works through the per-post route" do
      post "/api/v1/admin/blog_posts/#{post_record.id}/blog_comments/#{pending.id}/approve", headers: auth_header(admin)

      expect(pending.reload.approved).to be(true)
    end
  end

  it "updates a contact message's status" do
    message = ContactMessage.create!(name: "Jo", email: "jo@example.com", message: "Hi")

    patch "/api/v1/admin/inquiries/contacts/#{message.id}", params: { status: "replied" }, headers: auth_header(admin), as: :json

    expect(response).to have_http_status(:ok)
    expect(message.reload.status).to eq("replied")
  end
end
