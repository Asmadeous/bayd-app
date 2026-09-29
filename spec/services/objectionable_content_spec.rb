require "rails_helper"

RSpec.describe ObjectionableContent do
  it "masks a listed word whatever its case" do
    expect(described_class.mask("What the FUCK is this")).to eq("What the **** is this")
  end

  it "masks every listed word in the text" do
    expect(described_class.mask("shit, you bastard")).to eq("****, you *******")
  end

  it "leaves a listed word that is only part of a longer word" do
    expect(described_class.mask("Driving in from Scunthorpe")).to eq("Driving in from Scunthorpe")
  end

  it "leaves clean text alone" do
    expect(described_class.mask("Running 10 minutes late, sorry!")).to eq("Running 10 minutes late, sorry!")
  end

  it "passes blank text through" do
    expect(described_class.mask(nil)).to be_nil
    expect(described_class.mask("")).to eq("")
  end
end
