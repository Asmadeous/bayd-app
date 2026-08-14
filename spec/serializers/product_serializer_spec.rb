require "rails_helper"

RSpec.describe ProductSerializer do
  describe "shipping_speed" do
    it "serializes the default shipping_speed" do
      product = create(:product)

      hash = ProductSerializer.render_as_hash(product)

      expect(hash).to have_key(:shipping_speed)
      expect(hash[:shipping_speed]).to eq("fast")
    end

    it "serializes a custom shipping_speed" do
      product = create(:product, shipping_speed: "standard")

      hash = ProductSerializer.render_as_hash(product)

      expect(hash[:shipping_speed]).to eq("standard")
    end
  end
end
