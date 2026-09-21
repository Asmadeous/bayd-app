# Targeted, NON-destructive prod update: add Rim's facial/esthetic services +
# set Susi's phone. Runs safely on a populated production DB - it ONLY upserts
# (find_or_initialize_by / find_or_create_by) and NEVER deletes or deactivates
# anything, so it can't wipe live catalog/shop data the way a full `db:seed`
# would (db:seed does Product.destroy_all etc). Idempotent: re-running is a no-op.
#
# Run on prod once via:  kamal app exec "bin/rails runner 'load Rails.root.join(%q{db/seeds/add_facials_and_susi_phone.rb})'"
# Safe to delete this file after it has run on prod.

spa     = ServiceCategory.find_or_create_by!(slug: "spa")     { |c| c.name = "Spa";     c.position = 5 }
massage = ServiceCategory.find_or_create_by!(slug: "massage") { |c| c.name = "Massage"; c.position = 3 }

FACIAL_SERVICES = [
  { cat: spa,     name: "Express facial (women only)",           duration: 45, price: 95.00,  image: "/images/services/spa-facial.webp", desc: "A quick, refreshing facial — cleanse, exfoliation, mask, and hydration to leave skin glowing. Perfect between deeper treatments. Women only." },
  { cat: spa,     name: "Deep facial (women only)",              duration: 75, price: 135.00, image: "/images/services/spa-facial.webp", desc: "A thorough deep-cleansing facial with extractions, exfoliation, a treatment mask, and massage for a deeply refreshed, radiant complexion. Women only." },
  { cat: spa,     name: "Microdermabrasion add on (women only)", duration: 30, price: 50.00,  image: "/images/services/spa-facial.webp", desc: "A resurfacing add-on that gently buffs away dull, dead skin to reveal a smoother, brighter surface. Added to any facial. Women only." },
  { cat: spa,     name: "Problem skin facial (women only)",      duration: 90, price: 160.00, image: "/images/services/spa-facial.webp", desc: "A targeted facial for congested, acne-prone, or reactive skin, with deep cleansing, extractions, and calming treatment to rebalance the complexion. Women only." },
  { cat: spa,     name: "Full Back facial (women only)",         duration: 60, price: 120.00, image: "/images/services/spa-facial.webp", desc: "A back treatment that cleanses, exfoliates, and clears congestion across the full back — ideal for hard-to-reach breakouts. Women only." },
  { cat: spa,     name: "Half Back facial (women only)",         duration: 40, price: 65.00,  image: "/images/services/spa-facial.webp", desc: "A focused facial for the upper or lower back — cleansing, exfoliation, and extractions to clear and smooth the skin. Women only." },
  { cat: spa,     name: "Face chemical peel (women only)",       duration: 45, price: 150.00, image: "/images/services/spa-facial.webp", desc: "A professional chemical peel for the face that exfoliates at a deeper level to improve tone, texture, and clarity. Women only." },
  { cat: spa,     name: "Underarm chemical peel (women only)",   duration: 30, price: 150.00, image: "/images/services/spa-facial.webp", desc: "A brightening chemical peel for the underarms that targets darkness and uneven tone for smoother, more even skin. Women only." },
  { cat: spa,     name: "Upper back chemical peel (women only)", duration: 60, price: 200.00, image: "/images/services/spa-facial.webp", desc: "A deeper chemical peel treatment for the upper back to clear congestion and improve tone and texture over the area. Women only." },
  { cat: spa,     name: "Facial massage add on (women only)",    duration: 15, price: 40.00,  image: "/images/services/spa-facial.webp", desc: "A relaxing facial massage added to any treatment to boost circulation, ease tension, and enhance your glow. Women only." },
  { cat: massage, name: "Head & scalp massage (women only)",     duration: 30, price: 40.00,  desc: "A soothing head and scalp massage that releases tension and promotes relaxation and circulation. Women only." },
  { cat: massage, name: "Lymphatic drainage massage (full body, 1 hour, women only)", duration: 60, price: 140.00, desc: "A gentle, full-body lymphatic drainage massage that encourages circulation and reduces puffiness, leaving you lighter and refreshed. Women only." }
].freeze

facial_services = FACIAL_SERVICES.map do |s|
  svc = Service.find_or_initialize_by(name: s[:name])
  svc.assign_attributes(
    service_category:      s[:cat],
    duration_minutes:      s[:duration],
    price:                 s[:price],
    description:           s[:desc],
    requires_consultation: false,
    kids_only:             false,
    active:                true
  )
  svc.image_url = s[:image] if s[:image].present?
  svc.save!
  svc
end
puts "  #{facial_services.size} facial/esthetic services upserted"

# Link them to Rim (Medical Aesthetician). ADD-only: never removes her other
# services, so this can't clobber assignments the full seed's destroy_all would.
rim = User.find_by(email: "rim@baydspa.ca")&.employee_profile
if rim
  facial_services.each { |svc| EmployeeService.find_or_create_by!(employee_profile: rim, service: svc) }
  puts "  linked #{facial_services.size} services to Rim"
else
  puts "  [skip] Rim profile not found - services created but unlinked"
end

# Susi's phone. Only sets it; won't blank an existing number.
susi = User.find_by(email: "susi@baydspa.ca")
if susi
  susi.update!(phone: "+13063698034")
  puts "  set Susi's phone"
else
  puts "  [skip] Susi not found"
end
