require "rails_helper"

RSpec.describe OrderItem, type: :model do
  describe "#snapshot_product (before_validation on create)" do
    let(:product) { create(:product, name: "Adjustable Satin Sleep Bonnet", price: 30.00) }
    let(:order)   { create(:order) }

    context "without a variant" do
      it "snapshots the product's price and name" do
        item = OrderItem.create!(order: order, product: product, quantity: 2)

        expect(item.price).to eq(30.00)
        expect(item.name).to eq("Adjustable Satin Sleep Bonnet")
      end
    end

    context "with a variant that overrides the price" do
      it "uses the variant's effective_price and a labelled name" do
        variant = create(:product_variant, product: product, label: "Style 14", price: 45.00)

        item = OrderItem.create!(order: order, product: product, product_variant: variant, quantity: 1)

        expect(item.price).to eq(45.00)
        expect(item.name).to eq("Adjustable Satin Sleep Bonnet — Style 14")
      end
    end

    context "with a variant that has no price override" do
      it "falls back to the product's price via effective_price" do
        variant = create(:product_variant, product: product, label: "Style 2", price: nil)

        item = OrderItem.create!(order: order, product: product, product_variant: variant, quantity: 1)

        # effective_price = price || product.price => product price wins
        expect(item.price).to eq(30.00)
        expect(item.name).to eq("Adjustable Satin Sleep Bonnet — Style 2")
      end
    end

    it "does not overwrite an explicitly supplied price/name" do
      item = OrderItem.create!(order: order, product: product, quantity: 1, price: 5.00, name: "Custom")

      expect(item.price).to eq(5.00)
      expect(item.name).to eq("Custom")
    end
  end
end
