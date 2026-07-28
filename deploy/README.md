# B.A.Y.D — Deployment Runbook

Single self-hosted server. **nginx** is the public front door (TLS via certbot);
the **Rails API** runs in Docker behind kamal-proxy (bound to `127.0.0.1:8080`);
the **Next.js frontend** runs as a systemd service on `127.0.0.1:3001`; **Postgres
+ PostGIS** live on the same box.

```
browser ──443─▶ nginx ─┬─ api.baydspa.ca → 127.0.0.1:8080 (kamal-proxy → Rails :3000)
                       └─ baydspa.ca      → 127.0.0.1:3001 (Next.js)
```

Do the steps in order. Phases 1–7 are one-time; after that, pushes to `main`
auto-deploy via GitHub Actions.

---

## 1. DNS (do this first — propagation takes time)
Point all three at your server's IP (A records):
- `api.baydspa.ca`
- `baydspa.ca`
- `www.baydspa.ca`

## 2. Provision + harden the server
SSH in as root, copy the script over, run it:
```bash
scp deploy/server-setup.sh root@SERVER_IP:/root/
ssh root@SERVER_IP
# on the server:
SSH_PUBKEY="$(cat ~/.ssh/id_ed25519.pub)"  \   # YOUR laptop's public key
INSTALL_POSTGRES=true PG_PASSWORD='pick-a-strong-db-password' \
bash /root/server-setup.sh
```
**Before closing that root session**, open a new terminal and confirm:
```bash
ssh deploy@SERVER_IP        # must work with your key
```
Note the printed `DB_HOST=172.17.0.1` and DB user/password.

## 3. Fill secrets (on your laptop, in the repo)
```bash
cp deploy/production.env.example deploy/production.env
$EDITOR deploy/production.env         # KAMAL_REGISTRY_PASSWORD = a GH PAT with write:packages,
                                      # SECRET_KEY_BASE = $(bin/rails secret), DB_PASSWORD, etc.
```
Make sure `config/master.key` exists (it's gitignored). Edit `config/deploy.yml`:
```yaml
image: ghcr.io/YOUR-GH-OWNER/b_a_y_d_api
registry: { username: YOUR-GH-OWNER }
servers: { web: [ SERVER_IP ] }
```

## 4. First deploy of the API (one-time, manual)
```bash
set -a && source deploy/production.env && set +a
bin/kamal setup      # builds image → pushes to GHCR → boots API + kamal-proxy → runs migrations
curl -I http://SERVER_IP:8080   # optional: kamal-proxy is up (nginx not configured yet)
```

## 5. Seed an admin
```bash
bin/kamal console
# in the console:
User.create!(email: "you@baydspa.ca", password: "a-strong-password",
             first_name: "Admin", last_name: "One", role: :admin)
```

## 6. Frontend
Nothing manual — GitHub Actions builds the Next.js **image**, pushes it to GHCR, and
runs it on the server as a container on `127.0.0.1:3001` (see the `deploy-frontend`
job). No git/npm/source on the box. It ships automatically alongside the API.

## 7. nginx + TLS (on the server)
```bash
sudo cp /opt/bayd/deploy/nginx.conf.example /etc/nginx/sites-available/baydspa.ca
sudo ln -sf /etc/nginx/sites-available/baydspa.ca /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo certbot --nginx -d baydspa.ca -d www.baydspa.ca -d api.baydspa.ca \
     --agree-tos -m admin@baydspa.ca --redirect
sudo nginx -t && sudo systemctl reload nginx
```
Now `https://baydspa.ca` and `https://api.baydspa.ca/up` should work.

## 8. Webhooks + smoke test
Register these in each provider (Helcim / Square / SimplyBook):
`https://api.baydspa.ca/api/v1/webhooks/<provider>`. Then sign in as admin, add a
service + a provider with FSA coverage, and run a booking to a covered postal code.

## 9. Turn on auto-deploy (GitHub Actions)
- Generate a CI key: `ssh-keygen -t ed25519 -f bayd-ci -N ""`; append `bayd-ci.pub`
  to `/home/deploy/.ssh/authorized_keys` on the server.
- Add repo **Secrets** (Settings → Secrets and variables → Actions): `SSH_PRIVATE_KEY`
  (contents of `bayd-ci`), `SSH_HOST`, `RAILS_MASTER_KEY`, `SECRET_KEY_BASE`, and all
  the app secrets listed in `.github/workflows/deploy.yml`. (`GITHUB_TOKEN` is automatic.)
- Push to `main` → CI runs → on success the Deploy workflow ships the API and rebuilds
  the frontend. Manual re-run via the Actions tab ("Run workflow").

---

### Day-2 operations
| Task | Command |
|---|---|
| Deploy API manually | `set -a && source deploy/production.env && set +a && bin/kamal deploy` |
| Rails console | `bin/kamal console` |
| Tail logs | `bin/kamal logs -f` |
| Rollback API | `bin/kamal rollback` |
| Redeploy (API + frontend) | push to `main`, or run the **Deploy** workflow manually |
| DB console | `bin/kamal dbc` |

### Still on you (infra dashboards)
Sentry DSN, an uptime monitor pinging `/up`, automated Postgres backups, and
SPF/DKIM/DMARC DNS records for `@baydspa.ca` mail deliverability.
