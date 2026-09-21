# Targeted, NON-destructive prod update. Runs safely on a populated production
# DB - it ONLY upserts and re-points existing records, NEVER deletes/deactivates,
# so it can't wipe live catalog/shop data the way a full `db:seed` would.
# Idempotent: re-running is a no-op.
#
# Does three things:
#   1. Ensures Rim's 12 facial/esthetic services exist (upsert by name).
#   2. Moves them into a dedicated "Facials" category (they were first seeded
#      under spa/massage; this recategorizes them without touching other services).
#   3. Links all 12 to Rim, and sets Susi's phone.
#
# Run on prod: bin/rails runner "load Rails.root.join(%q{db/seeds/add_facials_and_susi_phone.rb})"
# Safe to delete after it has run on prod once.

facials = ServiceCategory.find_or_create_by!(slug: "facials") { |c| c.name = "Facials"; c.position = 5 }

FACIAL_SERVICES = [
  { name: "Express facial (women only)",                  duration: 45, price: 95.00,  desc: "A quick, refreshing facial — cleanse, exfoliation, mask, and hydration to leave skin glowing. Perfect between deeper treatments. Women only." },
  { name: "Deep facial (women only)",                     duration: 75, price: 135.00, desc: "A thorough deep-cleansing facial with extractions, exfoliation, a treatment mask, and massage for a deeply refreshed, radiant complexion. Women only." },
  { name: "Microdermabrasion add on (women only)",        duration: 30, price: 50.00,  desc: "A resurfacing add-on that gently buffs away dull, dead skin to reveal a smoother, brighter surface. Added to any facial. Women only." },
  { name: "Problem skin facial (women only)",             duration: 90, price: 160.00, desc: "A targeted facial for congested, acne-prone, or reactive skin, with deep cleansing, extractions, and calming treatment to rebalance the complexion. Women only." },
  { name: "Full Back facial (women only)",                duration: 60, price: 120.00, desc: "A back treatment that cleanses, exfoliates, and clears congestion across the full back — ideal for hard-to-reach breakouts. Women only." },
  { name: "Half Back facial (women only)",                duration: 40, price: 65.00,  desc: "A focused facial for the upper or lower back — cleansing, exfoliation, and extractions to clear and smooth the skin. Women only." },
  { name: "Face chemical peel (women only)",              duration: 45, price: 150.00, desc: "A professional chemical peel for the face that exfoliates at a deeper level to improve tone, texture, and clarity. Women only." },
  { name: "Underarm chemical peel (women only)",          duration: 30, price: 150.00, desc: "A brightening chemical peel for the underarms that targets darkness and uneven tone for smoother, more even skin. Women only." },
  { name: "Upper back chemical peel (women only)",        duration: 60, price: 200.00, desc: "A deeper chemical peel treatment for the upper back to clear congestion and improve tone and texture over the area. Women only." },
  { name: "Facial massage add on (women only)",           duration: 15, price: 40.00,  desc: "A relaxing facial massage added to any treatment to boost circulation, ease tension, and enhance your glow. Women only." },
  { name: "Head & scalp massage (women only)",            duration: 30, price: 40.00,  desc: "A soothing head and scalp massage that releases tension and promotes relaxation and circulation. Women only." },
  { name: "Lymphatic drainage massage (full body, 1 hour, women only)", duration: 60, price: 140.00, desc: "A gentle, full-body lymphatic drainage massage that encourages circulation and reduces puffiness, leaving you lighter and refreshed. Women only." }
].freeze

facial_services = FACIAL_SERVICES.map do |s|
  svc = Service.find_or_initialize_by(name: s[:name])
  svc.assign_attributes(
    service_category:      facials,
    duration_minutes:      s[:duration],
    price:                 s[:price],
    description:           s[:desc],
    requires_consultation: false,
    kids_only:             false,
    active:                true
  )
  svc.image_url = "/images/services/spa-facial.webp" if svc.image_url.blank?
  svc.save!
  svc
end
puts "  #{facial_services.size} facial services in the Facials category"

# Rim (Medical Aesthetician) performs ONLY these facials. Link all 12, and remove
# any non-facial links left from when she was seeded under spa/massage. Scoped to
# Rim's own employee_services join rows (no booking data), so it's safe.
rim = User.find_by(email: "rim@baydspa.ca")&.employee_profile
if rim
  facial_ids = facial_services.map(&:id)
  facial_services.each { |svc| EmployeeService.find_or_create_by!(employee_profile: rim, service: svc) }
  removed = rim.employee_services.where.not(service_id: facial_ids).delete_all
  puts "  linked #{facial_services.size} facials to Rim, removed #{removed} non-facial links"
else
  puts "  [skip] Rim profile not found"
end

# Susi's phone.
susi = User.find_by(email: "susi@baydspa.ca")
if susi
  susi.update!(phone: "+13063698034")
  puts "  set Susi's phone"
else
  puts "  [skip] Susi not found"
end
