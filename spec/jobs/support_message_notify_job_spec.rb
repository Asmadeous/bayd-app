require "rails_helper"

RSpec.describe SupportMessageNotifyJob, type: :job do
  let!(:admin) { create(:user, role: :admin) }
  let(:thread) { SupportThread.create!(name: "Ada", email: "ada@example.com") }

  def notes = Notification.where(user: admin, kind: "support_message")

  it "notifies admins on a thread's first message" do
    message = thread.post!(body: "Hi", from_staff: false)
    expect { described_class.perform_now(message.id) }.to change { notes.count }.by(1)
    expect(notes.last.title).to eq("New support chat message")
  end

  it "does not re-notify for back-to-back visitor messages" do
    thread.post!(body: "Hi", from_staff: false)
    second = thread.post!(body: "Are you there?", from_staff: false)
    expect { described_class.perform_now(second.id) }.not_to change { notes.count }
  end

  it "notifies again when the visitor replies after staff answered" do
    thread.post!(body: "Hi", from_staff: false)
    thread.post!(body: "Hello!", from_staff: true, sender: admin)
    reply = thread.post!(body: "Great, thanks", from_staff: false)
    expect { described_class.perform_now(reply.id) }.to change { notes.count }.by(1)
  end
end
