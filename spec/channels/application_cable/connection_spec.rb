require "rails_helper"

RSpec.describe ApplicationCable::Connection, type: :channel do
  let(:user) { create(:user) }

  def token_for(user_id)
    JWT.encode({ sub: user_id, exp: 30.days.from_now.to_i },
               ENV["SECRET_KEY_BASE"].presence || Rails.application.secret_key_base, "HS256")
  end

  it "connects with a valid token and identifies the user" do
    connect "/cable?token=#{token_for(user.id)}"
    expect(connection.current_user).to eq(user)
  end

  it "rejects a connection with no token" do
    expect { connect "/cable" }.to have_rejected_connection
  end

  it "rejects a connection with a garbage token" do
    expect { connect "/cable?token=not-a-jwt" }.to have_rejected_connection
  end

  it "rejects a token whose user no longer exists" do
    expect { connect "/cable?token=#{token_for(0)}" }.to have_rejected_connection
  end
end
