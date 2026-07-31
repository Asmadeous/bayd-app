# Traccar — live technician GPS

Stands up a self-hosted [Traccar](https://www.traccar.org/) server on the VM to
feed live technician locations into the Rails app.

## Data flow

```
Tech's phone (Traccar Client app, OsmAnd protocol)
  → this Traccar server        (VM :5055 device port)
  → forwards each position to  https://api.baydspa.ca/api/v1/webhooks/traccar
  → TraccarController checks X-Traccar-Secret, matches EmployeeProfile by
    traccar_device_id, writes EmployeeCurrentLocation (live) + LocationPing (history)
```

The `traccar_device_id` is set per employee in the **admin dashboard → Staff → edit
→ "Traccar Device ID"**. It must equal the device identifier the tech enters in
the phone app.

## ⚠️ Not yet verified live

These files are written to spec but have **not** been run against a real Traccar
server. Before trusting it, verify the two things below (both are quick):

1. **Forward body shape.** The Rails processor
   (`app/services/traccar/webhook_processor.rb`) reads `Array(payload[:positions])`
   — i.e. it expects `{"positions":[{...}]}`. Confirm Traccar's `forward.type=json`
   actually sends that wrapper. If it sends a flat position object instead, either
   adjust `forward` (a custom `forward.url` template) OR change the processor to
   read a single position. **Check the first real webhook payload in the Rails logs.**
2. **Secret match.** `forward.header` in `traccar.xml` and `TRACCAR_WEBHOOK_SECRET`
   in the Rails env must be identical, or every webhook 401s.

## Setup on the VM (64.6.175.177)

1. **DNS:** add A record `traccar.baydspa.ca → 64.6.175.177`.

2. **Files:** copy this dir to the VM, e.g. `/opt/traccar/`.
   Edit `traccar.xml` → set `forward.header` secret to your chosen
   `TRACCAR_WEBHOOK_SECRET` (invent a random string; put the SAME value in the
   Rails env / GitHub secret).

3. **Run it:**
   ```
   cd /opt/traccar
   docker compose up -d
   docker compose logs -f      # watch it boot
   ```

4. **nginx:** install `nginx-traccar.conf.example` as
   `/etc/nginx/sites-available/traccar.baydspa.ca`, symlink into `sites-enabled/`,
   then expand the cert to cover the new host:
   ```
   sudo certbot --nginx -d baydspa.ca -d www.baydspa.ca \
        -d api.baydspa.ca -d traccar.baydspa.ca --expand
   sudo nginx -t && sudo systemctl reload nginx
   ```

5. **Firewall:** open the device port so phones can reach it:
   ```
   sudo ufw allow 5055/tcp
   ```
   (Do NOT open 8082 — nginx fronts that over 443.)

6. **First login:** open `https://traccar.baydspa.ca`. Default admin is
   `admin` / `admin` — **change it immediately**. That login becomes your
   `TRACCAR_USER` / `TRACCAR_PASSWORD` (only used by `Traccar::Client` for admin
   queries; the live path is webhook-only).

7. **Register a device + tech's phone:**
   - In the Traccar web UI: add a device with a unique **identifier** (e.g. `bayd-jane-01`).
   - Put that same identifier in the admin dashboard → Staff → Traccar Device ID for Jane.
   - Jane installs the **Traccar Client** app (App Store / Play), sets:
     - Server URL: `http://64.6.175.177:5055` (device port)  — or your domain if you proxy 5055
     - Device identifier: `bayd-jane-01`
     - Turn tracking ON.

8. **Rails env** — set these (GitHub secrets for prod; deploy.yml has the non-secret ones):
   - `TRACCAR_URL=https://traccar.baydspa.ca`  (used by Traccar::Client)
   - `TRACCAR_USER`, `TRACCAR_PASSWORD`  (your changed admin login)
   - `TRACCAR_WEBHOOK_SECRET`  (must match traccar.xml forward.header)

## Verify

- Walk/drive with the phone app on → watch `docker compose logs -f` show positions.
- Watch Rails logs for the incoming webhook; confirm an `EmployeeCurrentLocation`
  row updates for that employee.
- If nothing lands: check the secret matches (401?), the device_id mapping, and
  the forward body shape (caveat #1 above).
