require "rails_helper"

# Hiring from the Jobs page: the applicant becomes a staff account on the
# company domain and gets a welcome email (at the address they applied with)
# with a link to set their password.
RSpec.describe "POST /api/v1/admin/job_applications/:id/hire", type: :request do
  let!(:admin) { create(:user, email: "admin@baydspa.ca", role: :admin) }
  let(:application) do
    JobApplication.create!(name: "Maria Lopez", email: "maria.l@gmail.com", phone: "4165550100", role_applied_for: "Nail Tech")
  end

  def auth_header(user)
    token = JWT.encode({ sub: user.id, role: user.role, exp: 30.days.from_now.to_i },
                       ENV["SECRET_KEY_BASE"].presence || Rails.application.secret_key_base, "HS256")
    { "Authorization" => "Bearer #{token}" }
  end

  def hire(attrs)
    post "/api/v1/admin/job_applications/#{application.id}/hire", params: { hire: attrs }, headers: auth_header(admin), as: :json
  end

  let(:details) { { first_name: "Maria", last_name: "Lopez", email: "maria@baydspa.ca", phone: "4165550100", title: "Nail Tech" } }

  it "creates the staff account, links the application and emails a set-password link" do
    expect { hire(details) }.to have_enqueued_mail(MagicLinkMailer, :staff_welcome)
      .with(an_instance_of(User), a_kind_of(String), to: "maria.l@gmail.com")

    expect(response).to have_http_status(:created)
    user = User.find_by(email: "maria@baydspa.ca")
    expect(user).to be_employee
    expect(user.employee_profile.title).to eq("Nail Tech")
    expect(application.reload).to have_attributes(status: "hired", employee_profile_id: user.employee_profile.id)
  end

  it "tells the new hire their sign-in email and links to set a password" do
    user = build(:user, email: "maria@baydspa.ca", first_name: "Maria", role: :employee)
    mail = MagicLinkMailer.staff_welcome(user, "raw-token", to: "maria.l@gmail.com")

    expect(mail.to).to eq([ "maria.l@gmail.com" ])
    expect(mail.body.encoded).to include("maria@baydspa.ca", "/reset-password?token=raw-token", "7 days")
  end

  it "gives a set-password link that works for a week" do
    hire(details)

    token = MagicLinkToken.where(user: User.find_by(email: "maria@baydspa.ca")).last
    expect(token.purpose).to eq("password_reset")
    expect(token.expires_at).to be_within(1.minute).of(7.days.from_now)
  end

  it "refuses a personal email, since staff sign in on the company domain" do
    expect { hire(details.merge(email: "maria.l@gmail.com")) }.not_to change(User, :count)

    expect(response).to have_http_status(:unprocessable_entity)
    expect(response.parsed_body["error"]).to include("@baydspa.ca")
    expect(application.reload.status).to eq("unread")
  end

  it "won't hire the same applicant twice" do
    hire(details)
    hire(details.merge(email: "maria2@baydspa.ca"))

    expect(response).to have_http_status(:unprocessable_entity)
    expect(response.parsed_body["error"]).to eq("This applicant was already hired.")
  end
end
