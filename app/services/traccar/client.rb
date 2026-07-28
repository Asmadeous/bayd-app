module Traccar
  class Client
    BASE_URL = ENV.fetch("TRACCAR_URL", "http://localhost:8082")

    def initialize
      @conn = Faraday.new(url: BASE_URL) do |f|
        f.request  :json
        f.response :json
        f.request  :retry, max: 2
        f.adapter  Faraday.default_adapter
      end
      @conn.basic_auth(
        ENV.fetch("TRACCAR_USER"),
        ENV.fetch("TRACCAR_PASSWORD")
      )
    end

    def devices
      get("/api/devices")
    end

    def positions(device_id: nil)
      params = device_id ? { deviceId: device_id } : {}
      get("/api/positions", params)
    end

    private

    def get(path, params = {})
      resp = @conn.get(path, params)
      raise "Traccar error #{resp.status}" unless resp.success?
      resp.body
    end
  end
end
