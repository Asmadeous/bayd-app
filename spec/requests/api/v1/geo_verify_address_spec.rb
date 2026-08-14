require "rails_helper"

RSpec.describe "POST /api/v1/geo/verify_address", type: :request do
  # A stand-in for a Geocoder::Result carrying just what the controller reads
  # (country_code, city, address, and data for the country-component fallback).
  def geo_result(country_code:, city: "Toronto", address: "1 Front St W, Toronto, ON")
    double("Geocoder::Result", country_code: country_code, city: city, address: address, data: {})
  end

  def post_verify(params)
    post "/api/v1/geo/verify_address", params: params, as: :json
    JSON.parse(response.body)
  end

  let(:real_ca) { { line1: "1 Front St W", city: "Toronto", province: "ON", postal_code: "M5J 2X5" } }

  it "accepts a real Canadian address with a valid postal code" do
    allow(Geocoder).to receive(:search).and_return([ geo_result(country_code: "CA") ])

    json = post_verify(real_ca)

    expect(response).to have_http_status(:ok)
    expect(json["valid"]).to be(true)
    expect(json["in_canada"]).to be(true)
    expect(json["postal_format_ok"]).to be(true)
  end

  it "rejects an address that geocodes outside Canada" do
    allow(Geocoder).to receive(:search).and_return([ geo_result(country_code: "US", city: "New York") ])

    json = post_verify(line1: "350 5th Ave", city: "New York", province: "NY", postal_code: "M5J 2X5")

    expect(json["valid"]).to be(false)
    expect(json["in_canada"]).to be(false)
  end

  it "rejects a non-Canadian postal code format without trusting the geocoder" do
    allow(Geocoder).to receive(:search).and_return([ geo_result(country_code: "CA") ])

    json = post_verify(real_ca.merge(postal_code: "12345"))

    expect(json["valid"]).to be(false)
    expect(json["postal_format_ok"]).to be(false)
  end

  it "rejects garbage that has a valid-looking postal code but does not geocode" do
    allow(Geocoder).to receive(:search).and_return([])

    json = post_verify(line1: "asdf", city: "asdf", province: "ON", postal_code: "X0X 0X0")

    expect(json["valid"]).to be(false)
    expect(json["in_canada"]).to be(false)
  end

  it "does not hard-block when the geocoder raises (postal format still gates)" do
    allow(Geocoder).to receive(:search).and_raise(StandardError, "timeout")

    json = post_verify(real_ca)

    expect(response).to have_http_status(:ok)
    expect(json["valid"]).to be(true) # postal format is valid; backend enforces Canada on create
    expect(json["error"]).to eq("geocode_unavailable")
  end

  it "is reachable without authentication" do
    allow(Geocoder).to receive(:search).and_return([ geo_result(country_code: "CA") ])
    post "/api/v1/geo/verify_address", params: real_ca, as: :json
    expect(response).not_to have_http_status(:unauthorized)
  end
end
