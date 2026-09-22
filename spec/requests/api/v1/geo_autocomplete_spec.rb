require "rails_helper"

# Address autocomplete proxy: /geo/autocomplete (suggestions) and
# /geo/place_details (resolve a pick to structured parts). Google is stubbed.
RSpec.describe "Address autocomplete", type: :request do
  around do |ex|
    ClimateControl.modify(GOOGLE_MAPS_API_KEY: "test-key") { ex.run }
  rescue NameError
    ENV["GOOGLE_MAPS_API_KEY"] = "test-key"
    ex.run
  ensure
    ENV.delete("GOOGLE_MAPS_API_KEY") unless defined?(ClimateControl)
  end

  def stub_places(path, body)
    conn = instance_double(Faraday::Connection)
    resp = instance_double(Faraday::Response, body: body.to_json)
    allow(conn).to receive(:get) do |_p, &blk|
      req = Struct.new(:params).new({})
      blk.call(req)
      resp
    end
    allow(Faraday).to receive(:new).and_return(conn)
    _ = path
  end

  describe "GET /api/v1/geo/autocomplete" do
    it "returns suggestions for a query" do
      stub_places("/maps/api/place/autocomplete/json", {
        "predictions" => [
          { "description" => "100 City Centre Dr, Mississauga, ON, Canada", "place_id" => "abc123" }
        ]
      })
      get "/api/v1/geo/autocomplete", params: { q: "100 City Centre" }

      expect(response).to have_http_status(:ok)
      s = response.parsed_body["suggestions"]
      expect(s.first["description"]).to include("City Centre")
      expect(s.first["place_id"]).to eq("abc123")
    end

    it "returns an empty list for a too-short query (no Google call)" do
      expect(Faraday).not_to receive(:new)
      get "/api/v1/geo/autocomplete", params: { q: "ab" }
      expect(response.parsed_body["suggestions"]).to eq([])
    end
  end

  describe "GET /api/v1/geo/place_details" do
    it "resolves a place_id to structured address parts" do
      stub_places("/maps/api/place/details/json", {
        "result" => {
          "formatted_address" => "100 City Centre Dr, Mississauga, ON L5B 2C9, Canada",
          "geometry" => { "location" => { "lat" => 43.59, "lng" => -79.64 } },
          "address_components" => [
            { "long_name" => "100", "types" => [ "street_number" ] },
            { "long_name" => "City Centre Drive", "types" => [ "route" ] },
            { "long_name" => "Mississauga", "types" => [ "locality" ] },
            { "short_name" => "ON", "types" => [ "administrative_area_level_1" ] },
            { "long_name" => "L5B 2C9", "types" => [ "postal_code" ] },
            { "short_name" => "CA", "types" => [ "country" ] }
          ]
        }
      })
      get "/api/v1/geo/place_details", params: { place_id: "abc123" }

      expect(response).to have_http_status(:ok)
      b = response.parsed_body
      expect(b["line1"]).to eq("100 City Centre Drive")
      expect(b["city"]).to eq("Mississauga")
      expect(b["province"]).to eq("ON")
      expect(b["postal_code"]).to eq("L5B 2C9")
      expect(b["latitude"]).to eq(43.59)
    end

    it "requires a place_id" do
      get "/api/v1/geo/place_details"
      expect(response).to have_http_status(:unprocessable_content)
    end
  end
end
