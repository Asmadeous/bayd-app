require "rails_helper"

RSpec.describe PingChannel, type: :channel do
  let(:user) { create(:user) }

  before { stub_connection current_user: user }

  it "subscribes and streams for the current user" do
    subscribe
    expect(subscription).to be_confirmed
    expect(subscription).to have_stream_for(user)
  end

  it "echoes a ping back to the user's stream" do
    subscribe
    expect {
      perform :ping, message: "hello"
    }.to have_broadcasted_to(user).from_channel(PingChannel)
      .with(hash_including(echo: "hello"))
  end
end
