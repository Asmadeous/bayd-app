require "rails_helper"

RSpec.describe VisitPaymentService do
  let(:user)  { create(:user) }
  let(:visit) { create(:visit, user: user) }
  let(:start) { 3.days.from_now.change(hour: 14) }
  let!(:lash) { line(0, 80, status: "pending") }
  let!(:pedi) { line(1, 40, status: "pending") }

  def line(position, total, status: "confirmed")
    create(:booking, user: user, visit: visit, visit_position: position, status: status,
           starts_at: start + position.hours, ends_at: start + (position + 1).hours, subtotal: total, total: total)
  end

  describe ".split" do
    it "splits by weight in cents and always adds up" do
      expect(described_class.split(100, [ 1, 1, 1 ])).to eq([ 33.34, 33.33, 33.33 ].map(&:to_d))
      expect(described_class.split(30, [ 80, 40 ])).to eq([ 20, 10 ].map(&:to_d))
      expect(described_class.split(10, [ 0, 0 ])).to eq([ 5, 5 ].map(&:to_d))
    end
  end

  context "with a card on file" do
    before do
      user.update!(square_customer_id: "C1", square_card_id: "CARD1")
      allow(SquareService).to receive(:charge_card).and_return(success: true, payment_id: "PAY1")
    end

    it "charges once for the visit and records each line's share" do
      result = described_class.new(visit).collect(amount: 120, tip: 12)

      expect(result.mode).to eq(:charged)
      expect(SquareService).to have_received(:charge_card).once.with(hash_including(amount_cents: 13_200, note: "VST-#{visit.id}"))
      expect(lash.payments.paid.sum(:amount)).to eq(80)
      expect(pedi.payments.paid.sum(:amount)).to eq(40)
      expect(lash.payments.paid.first.processor_ref).to eq("PAY1")
      expect([ lash.reload.status, pedi.reload.status ]).to eq(%w[confirmed confirmed])
    end

    it "splits the tip across the techs by line price" do
      described_class.new(visit).collect(amount: 120, tip: 12)
      expect(lash.tips.sum(:amount)).to eq(8)
      expect(pedi.tips.sum(:amount)).to eq(4)
      expect(pedi.tips.first.employee_profile).to eq(pedi.employee_profile)
    end

    it "splits a deposit across lines and leaves the rest owing" do
      described_class.new(visit).collect(amount: 30)
      expect([ lash.payments.paid.sum(:amount), pedi.payments.paid.sum(:amount) ]).to eq([ 20, 10 ])
      expect(visit.reload.outstanding_balance).to eq(90)
      expect(lash.reload.payment_status).to eq("deposit_paid")
    end
  end

  context "without a card on file" do
    before do
      allow(SquareService).to receive(:create_reference_link).and_return(success: true, url: "https://pay.test/x")
    end

    it "makes one VST- link with a line per service and pending shares" do
      result = described_class.new(visit).collect(amount: 120, tip: 6)

      expect(result.mode).to eq(:link)
      expect(result.url).to eq("https://pay.test/x")
      expect(SquareService).to have_received(:create_reference_link).with(hash_including(
        reference: "VST-#{visit.id}",
        line_items: [ hash_including(price_cents: 8000), hash_including(price_cents: 4000), hash_including(name: "Gratuity", price_cents: 600) ]
      ))
      expect(lash.payments.pending.sum(:amount)).to eq(80)
      expect(pedi.payments.pending.sum(:amount)).to eq(40)
    end

    it "settles every line when the VST- webhook lands (tip included in the amount)" do
      described_class.new(visit).collect(amount: 120, tip: 6)
      PaymentWebhookProcessor.settle("VST-#{visit.id}", processor: "square", txn_ref: "PAY9", amount: 126.0)

      expect([ lash.payments.paid.sum(:amount), pedi.payments.paid.sum(:amount) ]).to eq([ 80, 40 ])
      expect([ lash.reload.status, pedi.reload.status ]).to eq(%w[confirmed confirmed])
      expect(visit.reload.outstanding_balance).to eq(0)
    end
  end

  it "applies a gift card first, split across lines" do
    card = GiftCard.create!(initial_balance: 60, current_balance: 60, active: true)
    allow(SquareService).to receive(:create_reference_link).and_return(success: true, url: "u")

    described_class.new(visit).collect(amount: 120, gift_card_code: card.code)

    expect(card.reload.current_balance).to eq(0)
    expect([ lash.payments.where(method: "gift_card").sum(:amount), pedi.payments.where(method: "gift_card").sum(:amount) ]).to eq([ 40, 20 ])
    expect(SquareService).to have_received(:create_reference_link).with(hash_including(
      line_items: [ hash_including(price_cents: 4000), hash_including(price_cents: 2000) ]
    ))
  end

  describe "Visit#required_deposit" do
    it "takes the group deposit once on the whole visit" do
      visit.update!(client_type: "group")
      expect(visit.required_deposit).to eq(50) # 25% of 120 = 30, below the $50 minimum
    end
  end
end
