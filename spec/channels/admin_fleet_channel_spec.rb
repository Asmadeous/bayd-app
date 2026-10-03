require "rails_helper"

RSpec.describe AdminFleetChannel, type: :channel do
  let(:canada) { Franchise.default }
  let(:admin) { create(:user, email: "admin@baydspa.ca", role: :admin, franchise: canada) }
  let(:tech)  { create(:employee_profile, user: create(:user, first_name: "Susi", email: "susi@baydspa.ca", role: :employee)) }

  it "lets a franchise admin subscribe to their franchise's fleet stream" do
    stub_connection current_user: admin
    subscribe
    expect(subscription).to be_confirmed
    expect(subscription).to have_stream_from("admin:fleet:#{canada.id}")
  end

  it "gives a super admin every franchise's fleet" do
    stub_connection current_user: create(:user, email: "owner@baydspa.ca", role: :super_admin)
    subscribe
    expect(subscription).to have_stream_from("admin:fleet:all")
  end

  it "rejects a non-admin" do
    stub_connection current_user: create(:user)
    subscribe
    expect(subscription).to be_rejected
  end

  it "broadcasts a tech position to their franchise's stream and the all-franchise stream" do
    expect {
      described_class.broadcast_position(tech, latitude: 43.7, longitude: -79.4, on_shift: true)
    }.to have_broadcasted_to("admin:fleet:#{tech.franchise_id}").with(
      hash_including(type: "fleet_position", employee_profile_id: tech.id, name: a_string_starting_with("Susi"), on_shift: true)
    ).and have_broadcasted_to("admin:fleet:all")
  end
end
