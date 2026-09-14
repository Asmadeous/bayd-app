require "rails_helper"

RSpec.describe AdminFleetChannel, type: :channel do
  let(:admin) { create(:user, email: "admin@baydspa.ca", role: :admin) }
  let(:tech)  { create(:employee_profile, user: create(:user, first_name: "Susi", email: "susi@baydspa.ca", role: :employee)) }

  it "lets an admin subscribe to the fleet stream" do
    stub_connection current_user: admin
    subscribe
    expect(subscription).to be_confirmed
    expect(subscription).to have_stream_from("admin:fleet")
  end

  it "rejects a non-admin" do
    stub_connection current_user: create(:user)
    subscribe
    expect(subscription).to be_rejected
  end

  it "broadcasts a tech position to the fleet stream" do
    expect {
      described_class.broadcast_position(tech, latitude: 43.7, longitude: -79.4, on_shift: true)
    }.to have_broadcasted_to("admin:fleet").with(
      hash_including(type: "fleet_position", employee_profile_id: tech.id, name: a_string_starting_with("Susi"), on_shift: true)
    )
  end
end
