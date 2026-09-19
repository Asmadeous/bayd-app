puts "Seeding..."

# NOTE: ServiceArea (zones with postal_codes + travel_fee) is a real, working
# admin CRUD feature (Dashboard → Service Areas) but is NOT wired into any
# coverage or pricing logic yet — AssignmentService/CoverageController check
# coverage entirely via EmployeeProfile#service_fsas below. Deliberately not
# seeded here: a ServiceArea row with no postal_codes and a placeholder $0 fee
# would sit in the admin panel looking configured while controlling nothing.
# Set real zones there once ServiceArea is wired into coverage/travel pricing.

# ── Service categories ────────────────────────────────────────────────────────
categories = {
  "nails"   => ServiceCategory.find_or_create_by!(slug: "nails")   { |c| c.name = "Nails";   c.position = 1 },
  "lashes"  => ServiceCategory.find_or_create_by!(slug: "lashes")  { |c| c.name = "Lashes";  c.position = 2 },
  "massage" => ServiceCategory.find_or_create_by!(slug: "massage") { |c| c.name = "Massage"; c.position = 3 },
  "waxing"  => ServiceCategory.find_or_create_by!(slug: "waxing")  { |c| c.name = "Waxing";  c.position = 4 },
  "spa"     => ServiceCategory.find_or_create_by!(slug: "spa")     { |c| c.name = "Spa";     c.position = 5 }
}
puts "  #{categories.size} service categories"

# ── Services (real menu — Beauty @ Your Door) ─────────────────────────────────
# "consult: true" == "Price varies" on the live menu (quote on request).
services_data = [
  # Nails
  { category: "nails",   name: "Manicure",                                     duration: 30,  price: 40.00, desc: "A classic manicure at home — nails shaped and buffed, cuticles tidied, a relaxing hand massage, and a polish of your choice for a clean, put-together finish." },
  { category: "nails",   name: "Pedicure",                                     duration: 60,  price: 50.00, desc: "A soothing at-home pedicure with a warm soak, nail shaping, cuticle care, gentle exfoliation, a foot-and-calf massage, and polish to finish." },
  { category: "nails",   name: "Jelly Spa Pedicure",                           duration: 60,  price: 75.00, desc: "An upgraded spa pedicure using a jelly-textured soak that softens skin while you relax, with nail shaping, cuticle care, exfoliation, and a foot-and-calf massage before polish." },
  { category: "nails",   name: "Manicure and pedicure",                        duration: 75,  price: 75.00, desc: "Our full hand-and-foot treatment: a complete manicure and pedicure in one visit, with shaping, cuticle care, massage, and polish for both." },
  { category: "nails",   name: "Shellac manicure",                             duration: 45,  price: 45.00, desc: "A gel-based shellac manicure with shaping, cuticle care, and a long-wearing, chip-resistant colour that stays glossy for up to two weeks." },
  { category: "nails",   name: "Shellac Pedicure",                             duration: 45,  price: 55.00, desc: "A pedicure finished with durable shellac polish — soak, shaping, cuticle care, and a high-shine colour that lasts far longer than regular polish." },
  { category: "nails",   name: "Shellac manicure and pedicure",                duration: 90,  price: 85.00, desc: "A complete shellac manicure and pedicure — long-lasting, chip-resistant colour on both hands and feet, with full shaping, cuticle care, and massage." },
  { category: "nails",   name: "Shellac manicure and regular pedicure",        duration: 90,  price: 80.00, desc: "A long-wearing shellac manicure paired with a classic polish pedicure — the best of both, with full nail care and massage throughout." },
  { category: "nails",   name: "Regular Manicure and shellac pedicure",        duration: 90,  price: 80.00, desc: "A classic polish manicure paired with a durable shellac pedicure, so your feet stay glossy and chip-free between visits." },
  { category: "nails",   name: "Shellac Polish Change",                        duration: 30,  price: 35.00, desc: "A quick refresh that removes your existing shellac and applies a new long-lasting shellac colour — no full manicure needed." },
  { category: "nails",   name: "Shellac removal",                              duration: 30,  price: 15.00, desc: "Gentle, careful removal of shellac or gel polish that protects the natural nail — ideal on its own or before a new set." },
  { category: "nails",   name: "Polish change",                                duration: 15,  price: 25.00, desc: "A fast switch to a fresh regular-polish colour on nails that are already in good shape — perfect for a quick change of look." },
  { category: "nails",   name: "Gel X",                                        duration: 75,  price: 80.00, desc: "A full set of soft-gel Gel-X extensions — lightweight, natural-looking length applied with gel for a strong, flexible, long-lasting finish." },
  { category: "nails",   name: "Gel overlay",                                  duration: 60,  price: 50.00, desc: "A protective gel overlay applied over your natural nails to add strength and a durable, glossy finish without adding length." },
  { category: "nails",   name: "Gel removal",                                  duration: 30,  price: 30.00, desc: "Safe, careful removal of gel or Gel-X enhancements that keeps the natural nail healthy underneath." },
  { category: "nails",   name: "Full Set nails",                               duration: 75,  price: 70.00, desc: "A brand-new full set of nail extensions shaped and finished to your chosen length and style, with a polished, long-wearing result." },
  { category: "nails",   name: "Nail refil",                                   duration: 90,  price: 55.00, desc: "A fill for grown-out extensions — regrowth is filled in, the shape restored, and the finish refreshed to keep your set looking new." },
  { category: "nails",   name: "Nail clip and file",                           duration: 15,  price: 20.00, desc: "A simple tidy-up: nails clipped and filed to a neat, comfortable length and shape. Great as a quick maintenance visit." },
  { category: "nails",   name: "Nail repair",                                  duration: 15,  price: 0.00, consult: true, desc: "Repair for a chipped, cracked, or broken nail or extension. Price is quoted on the spot based on what's needed." },
  { category: "nails",   name: "Paraffin add on",                             duration: 15,  price: 20.00, desc: "A warm paraffin-wax treatment added to your manicure or pedicure to deeply soften and hydrate the hands or feet." },
  { category: "nails",   name: "French add on",                               duration: 30,  price: 10.00, desc: "Add a timeless French finish — clean white tips over a natural base — to any manicure or nail service." },
  { category: "nails",   name: "Princess manicure (children up to 13 years)",  duration: 15,  price: 25.00, kids: true, desc: "A gentle, fun manicure designed for children up to 13 — light nail shaping and a favourite polish colour for a first pampering experience." },
  { category: "nails",   name: "Princess Pedicure (children up to 13 years)",  duration: 30,  price: 40.00, kids: true, desc: "A kid-friendly pedicure for children up to 13, with a gentle soak, careful nail care, and a fun polish colour of their choice." },
  { category: "nails",   name: "Princess manicure and pedicure (children)",    duration: 30,  price: 50.00, kids: true, desc: "The full princess treatment for children — a gentle manicure and pedicure together, with fun colours and a little extra pampering." },
  # Lashes — full sets
  { category: "lashes",  name: "Lashes Classic set",                           duration: 90,  price: 135.00, image: "/images/services/lashes-classic-set.jpg", desc: "A full set of classic lash extensions — one extension applied to each natural lash for a natural, defined look, like a great coat of mascara." },
  { category: "lashes",  name: "Lashes Hybrid Set",                            duration: 120, price: 155.00, image: "/images/services/lashes-hybrid-set.jpg", desc: "A hybrid lash set blending classic and volume techniques for added texture and fullness — more depth than classic, softer than a full volume set." },
  { category: "lashes",  name: "Lashes Volume set",                            duration: 150, price: 160.00, image: "/images/services/lashes-volume-set.jpg", desc: "A full volume set using lightweight lash fans for a fluffy, glamorous, high-impact look with plenty of density." },
  { category: "lashes",  name: "Lashes Glam Volume",                           duration: 150, price: 170.00, image: "/images/services/lashes-glam-volume.jpg", desc: "A dense, dramatic glam volume set with fuller fans for maximum impact — perfect for those who love a bold, glamorous lash look." },
  { category: "lashes",  name: "Lashes Mega Volume",                           duration: 180, price: 225.00, image: "/images/services/lashes-mega-volume.jpg", desc: "Our fullest, most dramatic lash set — ultra-fine, high-count fans for maximum density and a bold, show-stopping finish." },
  # Lashes — refills
  { category: "lashes",  name: "Lash refill classic",                          duration: 60,  price: 100.00, image: "/images/services/lash-refill-classic.jpg", desc: "A maintenance fill for classic lashes — grown-out and shed extensions are replaced to keep your set looking full. Best booked within 2–3 weeks." },
  { category: "lashes",  name: "Lash refill hybrid",                           duration: 60,  price: 115.00, image: "/images/services/lash-refill-hybrid.jpg", desc: "A maintenance fill for hybrid lashes to top up shed extensions and keep your set full. Best booked within 2–3 weeks of your last visit." },
  { category: "lashes",  name: "Lash refill glam",                             duration: 90,  price: 125.00, image: "/images/services/lash-refill-glam.jpg", desc: "A maintenance fill for glam volume lashes, replacing shed fans to keep your look dense and dramatic. Best booked within 2–3 weeks." },
  { category: "lashes",  name: "Lash refill volume",                           duration: 90,  price: 135.00, image: "/images/services/lash-refill-volume.jpg", desc: "A maintenance fill for volume lashes to restore fullness between appointments. Best booked within 2–3 weeks of your last visit." },
  { category: "lashes",  name: "Lash refill mega",                             duration: 90,  price: 145.00, image: "/images/services/lash-refill-mega.jpg", desc: "A maintenance fill for mega volume lashes, replacing shed fans to keep your set at its fullest. Best booked within 2–3 weeks." },
  # Massage
  { category: "massage", name: "Swedish Deep Tissue Massage",                  duration: 75,  price: 95.00, desc: "A 75-minute massage blending relaxing Swedish strokes with deep-tissue pressure to ease tension and target tight muscles — on your own table or ours." },
  { category: "massage", name: "Thai foot massage",                            duration: 45,  price: 70.00, desc: "A 45-minute Thai foot massage using pressure-point techniques on the feet and lower legs to relieve tension and boost circulation." },
  { category: "massage", name: "Back massage",                                 duration: 30,  price: 50.00, desc: "A focused 30-minute back massage that targets tension across the back and shoulders — a quick, effective release for tight, tired muscles." },
  { category: "massage", name: "Shoulder massage",                             duration: 15,  price: 40.00, desc: "A quick 15-minute shoulder and neck massage to release built-up tension — a perfect add-on or a fast reset for a stiff neck." },
  # Waxing
  { category: "waxing",  name: "Wax Underarm",                                 duration: 15,  price: 30.00, desc: "Quick, thorough underarm waxing for smooth, hair-free results that last far longer than shaving." },
  { category: "waxing",  name: "Wax Half Arm",                                 duration: 30,  price: 25.00, desc: "Waxing for the lower or upper half of the arms, leaving skin smooth and hair-free." },
  { category: "waxing",  name: "Wax Full arm",                                 duration: 30,  price: 40.00, desc: "Complete waxing of the full arm, from shoulder to wrist, for smooth, long-lasting results." },
  { category: "waxing",  name: "Wax Half leg",                                 duration: 30,  price: 35.00, desc: "Waxing for the lower legs (knee to ankle), leaving skin smooth and hair-free for weeks." },
  { category: "waxing",  name: "Wax full leg",                                 duration: 45,  price: 55.00, desc: "Complete full-leg waxing, from thigh to ankle, for smooth, long-lasting, hair-free legs." },
  { category: "waxing",  name: "Wax Bikini",                                   duration: 15,  price: 35.00, desc: "A tidy bikini-line wax that removes hair beyond the swimsuit edge for a clean, comfortable finish." },
  { category: "waxing",  name: "Brazilian (women only)",                       duration: 45,  price: 70.00, desc: "A complete Brazilian wax removing all hair from the intimate area, performed with care and discretion in the comfort of your own home. Women only." },
  { category: "waxing",  name: "Wax Back",                                     duration: 15,  price: 40.00, desc: "Full-back waxing for smooth, hair-free skin that lasts far longer than shaving." },
  { category: "waxing",  name: "Wax Full Face",                                duration: 30,  price: 35.00, desc: "Gentle full-face waxing to remove unwanted facial hair, leaving skin smooth and makeup-ready." },
  { category: "waxing",  name: "Wax Chin and Upper Lip",                       duration: 15,  price: 20.00, desc: "Quick, precise waxing of the chin and upper lip to remove fine facial hair for a smooth finish." },
  { category: "waxing",  name: "Wax eyebrows and shaping",                     duration: 15,  price: 20.00, desc: "Eyebrow waxing and shaping to clean up the brow line and define a shape that suits your face." },
  { category: "waxing",  name: "Wax Full body (women only, excluding Brazilian)", duration: 90,  price: 175.00, desc: "Head-to-toe waxing covering arms, legs, underarms, and more in a single visit (excluding Brazilian). Women only." },
  { category: "waxing",  name: "Eyebrow tint",                                 duration: 15,  price: 10.00, desc: "A semi-permanent tint that darkens and defines the brows for a fuller, more polished look without daily makeup." },
  # Spa / Body
  { category: "spa",     name: "Deluxe spa manicure + nail care",             duration: 60,  price: 65.00, image: "/images/services/nails-manicure.webp", desc: "An elevated spa manicure with extended nail and cuticle care, exfoliation, a hydrating mask, and a relaxing hand-and-arm massage, finished with polish." },
  { category: "spa",     name: "Body scrub",                                   duration: 30,  price: 50.00, desc: "A full-body exfoliating scrub that sloughs away dead skin and leaves you feeling smooth, soft, and refreshed — a spa treatment at home." },
  { category: "spa",     name: "Group booking",                                duration: 270, price: 0.00, consult: true, desc: "Book a shared session for a group — perfect for parties, bridal prep, or a spa day with friends. We bring the pampering to you. Price quoted based on your group and chosen services." }
]

# Pick a real service photo for a menu entry. An explicit `image:` always wins;
# otherwise we choose by service name (pedicure vs polish vs manicure) and fall
# back to a per-category default. Every active service ends up with a photo —
# files live under client/public/images/services/.
def service_image_for(s)
  return s[:image] if s[:image].present?
  name = s[:name].to_s.downcase
  case s[:category]
  when "nails"
    if    name.include?("pedicure")                              then "/images/services/nails-pedicure.webp"
    elsif name.include?("polish") || name.include?("removal")    then "/images/services/nails-polish.webp"
    elsif name.include?("clip") || name.include?("repair") ||
          name.include?("paraffin") || name.include?("french")   then "/images/services/nails-care.webp"
    elsif name.include?("gel") || name.include?("full set") ||
          name.include?("refil") || name.include?("overlay")     then "/images/services/nails-finished.webp"
    else                                                              "/images/services/nails-manicure.webp"
    end
  when "massage" then "/images/services/massage.jpg"
  when "waxing"  then "/images/services/waxing.jpg"
  when "spa"     then "/images/services/spa-facial.webp"
  end
end

services = services_data.map do |s|
  svc = Service.find_or_initialize_by(name: s[:name])
  svc.assign_attributes(
    service_category:      categories[s[:category]],
    duration_minutes:      s[:duration],
    price:                 s[:price],
    description:           s[:desc],
    requires_consultation: s.fetch(:consult, false),
    kids_only:             s.fetch(:kids, false),
    active:                true
  )
  # Real service photo (explicit image: wins; else chosen by name/category).
  img = service_image_for(s)
  svc.image_url = img if img.present?
  # Kids use the dedicated "Princess" services. Elderly pay the same as adults —
  # no tier overrides (clears any previously-seeded elderly hike).
  svc.tier_prices = {}
  svc.save!
  svc
end
# Deactivate any service no longer on the real menu (kept if past bookings ref it).
Service.where.not(id: services.map(&:id)).update_all(active: false)
puts "  #{services.size} services"

# ── Product catalog ───────────────────────────────────────────────────────────
# Fragrances is a parent category with Men's / Women's subcategories.
fragrances = ProductCategory.find_or_create_by!(slug: "fragrances") { |c| c.name = "Fragrances"; c.position = 1 }

prod_cats = {
  "mens-fragrances"   => ProductCategory.find_or_create_by!(slug: "mens-fragrances")   { |c| c.name = "Men's";            c.position = 1 },
  "womens-fragrances" => ProductCategory.find_or_create_by!(slug: "womens-fragrances") { |c| c.name = "Women's";          c.position = 2 },
  "hair-accessories"  => ProductCategory.find_or_create_by!(slug: "hair-accessories")  { |c| c.name = "Hair Accessories"; c.position = 3 },
  "supplements"       => ProductCategory.find_or_create_by!(slug: "supplements")       { |c| c.name = "Supplements";      c.position = 4 },
  "bath-body"         => ProductCategory.find_or_create_by!(slug: "bath-body")         { |c| c.name = "Bath & Body";      c.position = 5 },
  "makeup"            => ProductCategory.find_or_create_by!(slug: "makeup")            { |c| c.name = "Makeup";           c.position = 6 },
  "beauty-tools"      => ProductCategory.find_or_create_by!(slug: "beauty-tools")      { |c| c.name = "Beauty Tools";     c.position = 7 },
  "skincare"          => ProductCategory.find_or_create_by!(slug: "skincare")          { |c| c.name = "Skincare";         c.position = 8 },
  "health-wellness"   => ProductCategory.find_or_create_by!(slug: "health-wellness")   { |c| c.name = "Health & Wellness"; c.position = 9 },
  "nails"             => ProductCategory.find_or_create_by!(slug: "nails")             { |c| c.name = "Nails";            c.position = 10 },
  "lashes"            => ProductCategory.find_or_create_by!(slug: "lashes")            { |c| c.name = "Lashes";           c.position = 11 },
  "massage"           => ProductCategory.find_or_create_by!(slug: "massage")           { |c| c.name = "Massage";          c.position = 12 },
  "waxing"            => ProductCategory.find_or_create_by!(slug: "waxing")            { |c| c.name = "Waxing";           c.position = 13 },
  "spa"               => ProductCategory.find_or_create_by!(slug: "spa")               { |c| c.name = "Spa";              c.position = 14 }
}
prod_cats["mens-fragrances"].update!(parent: fragrances)
prod_cats["womens-fragrances"].update!(parent: fragrances)

# The current, valid set of product categories. Anything not in here is a
# leftover from a previous schema (e.g. old "Massage Oils" / "Nail Care") and is
# removed after the product cleanup below (once its products are gone).
current_category_ids = ([ fragrances ] + prod_cats.values).map(&:id)
# Re-activate the current set in case a prior run had toggled any off.
ProductCategory.where(id: current_category_ids).where(active: false).update_all(active: true)

# Real catalog. Add new rows here as they come in.
products_data = [
  # ── SYREN Fragrances · Men's ──
  { category: "mens-fragrances",   name: "Syren - Black Caviar",          sku: "SYREN-BLACK-CAVIAR",          price: 66.50, stock: 100, desc: "A bold, sophisticated men's eau de parfum with a deep, long-lasting scent profile. Part of the Syren Caviar collection." },
  { category: "mens-fragrances",   name: "Syren - Blue Caviar",           sku: "SYREN-BLUE-CAVIAR",           price: 66.50, stock: 100, desc: "A fresh yet refined men's eau de parfum with a crisp, modern character from the Syren Caviar line." },
  { category: "mens-fragrances",   name: "Syren - Black Caviar Paradiso", sku: "SYREN-BLACK-CAVIAR-PARADISO", price: 66.50, stock: 100, desc: "A luxurious men's eau de parfum with a warm, layered scent. A richer take on Syren's signature Black Caviar." },
  { category: "mens-fragrances",   name: "Syren - Men's Discovery Set",   sku: "SYREN-MENS-DISCOVERY-SET",    price: 24.50, stock: 100, desc: "A discovery set of Syren men's fragrances in travel sizes — an easy way to sample the collection before committing to a full bottle." },
  # ── SYREN Fragrances · Women's ──
  { category: "womens-fragrances", name: "Syren - Pink Caviar",           sku: "SYREN-PINK-CAVIAR",           price: 66.50, stock: 100, desc: "An elegant women's eau de parfum with a refined, feminine scent profile from the Syren Caviar collection." },
  { category: "womens-fragrances", name: "Syren - Women's Discovery Set", sku: "SYREN-WOMENS-DISCOVERY-SET",  price: 24.50, stock: 100, desc: "A discovery set of Syren women's fragrances in travel sizes — sample the collection before choosing a full bottle." },
  { category: "womens-fragrances", name: "Syren - Pink Caviar Lotus",     sku: "SYREN-PINK-CAVIAR-LOTUS",     price: 66.50, stock: 100, desc: "A soft, floral women's eau de parfum built around delicate lotus notes. A lighter expression of Syren's Pink Caviar." },
  { category: "womens-fragrances", name: "Syren - Pink Caviar Luxe",      sku: "SYREN-PINK-CAVIAR-LUXE",      price: 66.50, stock: 100, desc: "A luxurious, long-lasting women's eau de parfum with a deeper, more intense scent from the Syren Caviar line." },
  # ── CashyMart ──
  { category: "hair-accessories",  name: "Adjustable Satin Sleep Bonnet", sku: "CASHYMART-SATIN-SLEEP-BONNET", price: 19.32, stock: 100,
    desc: "Double-layer satin sleep bonnet. Weight: 65g. Length: 38cm (14.9 in). Adjustable fit." },
  # ── LIVS · Supplements ──
  { category: "supplements",       name: "Tongkat Ali 900mg",             sku: "LIVS-TONGKAT-ALI-900MG",       price: 19.99, stock: 100, desc: "Tongkat Ali supplement, 900mg per serving. A traditional botanical taken to support energy and vitality. Vegetarian capsules." },
  { category: "supplements",       name: "Berberine 1,500mg",             sku: "LIVS-BERBERINE-1500MG",        price: 19.99, stock: 100, desc: "Berberine supplement, 1,500mg per serving. A plant compound commonly taken to support metabolic and blood-sugar health." },
  { category: "supplements",       name: "Akkermansia + Inulin",          sku: "LIVS-AKKERMANSIA-INULIN",      price: 22.39, stock: 100, desc: "A gut-health supplement combining Akkermansia with inulin, a prebiotic fibre that supports a healthy microbiome." },
  { category: "supplements",       name: "Trace Minerals Complex",        sku: "LIVS-TRACE-MINERALS-COMPLEX",  price: 17.99, stock: 100, desc: "A trace minerals complex providing essential micro-minerals to support daily nutrition and overall wellness." },
  { category: "supplements",       name: "Raw Shilajit Capsules",         sku: "LIVS-RAW-SHILAJIT",            price: 23.99, stock: 100, desc: "Raw Shilajit capsules, 10:1 extract with fulvic acid and 85+ trace minerals. Taken to support energy and mineral intake. 90 vegetarian capsules." },
  { category: "supplements",       name: "Organic Spirulina",             sku: "LIVS-ORGANIC-SPIRULINA",       price: 15.99, stock: 100, desc: "Organic spirulina, a nutrient-dense blue-green algae rich in protein and antioxidants, taken as a daily wellness supplement." },
  { category: "supplements",       name: "Women's Shilajit",              sku: "LIVS-WOMENS-SHILAJIT",         price: 23.99, stock: 100, desc: "A women's Shilajit supplement with fulvic acid and trace minerals, formulated to support energy and daily vitality." },
  { category: "supplements",       name: "Choline + Iron",                sku: "LIVS-CHOLINE-IRON",            price: 19.99, stock: 100, desc: "A supplement combining choline and iron to support energy, cognitive function, and healthy iron levels." },
  { category: "supplements",       name: "Berberine Capsules",            sku: "LIVS-BERBERINE-CAPSULES",      price: 17.59, stock: 100, desc: "Berberine capsules — a plant compound commonly taken to support metabolic health and blood-sugar balance." },
  { category: "supplements",       name: "Apigenin 300mg",                sku: "LIVS-APIGENIN-300MG",          price: 15.99, stock: 100, desc: "Apigenin supplement, 300mg per serving. A plant flavonoid taken to support relaxation and overall wellness." },
  { category: "supplements",       name: "Turkesterone 1,500mg",          sku: "LIVS-TURKESTERONE-1500MG",     price: 22.39, stock: 100, desc: "Turkesterone supplement, 1,500mg per serving. A plant compound popular among those supporting active, athletic lifestyles." },
  { category: "supplements",       name: "Men's Shilajit",                sku: "LIVS-MENS-SHILAJIT",           price: 27.99, stock: 100, desc: "A men's Shilajit supplement with fulvic acid and trace minerals, taken to support energy, stamina, and vitality." },
  # ── LIVS · Bath & Body ──
  { category: "bath-body",         name: "Bath Salts",                    sku: "LIVS-BATH-SALTS",              price: 8.00,  stock: 100, desc: "Mineral bath salts that dissolve into a warm bath to soothe tired muscles and support a relaxing, spa-like soak at home." },
  # ── BeNat ──
  { category: "makeup",            name: "All-Natural Bronzer Loose Powder", sku: "BENAT-BRONZER-LOOSE-POWDER", price: 12.99, stock: 100,
    desc: "Eco-friendly all-natural loose bronzer powder." },
  { category: "beauty-tools",      name: "Reusable Facial Rounds Pads (5pcs)", sku: "BENAT-FACIAL-ROUNDS-PADS-5PC", price: 8.44, stock: 100, desc: "A 5-piece set of reusable facial rounds — a soft, washable, eco-friendly alternative to disposable cotton pads for cleansing and toner." },
  { category: "beauty-tools",      name: "Electric Oil Applicator and Vibration Scalp Massager 2 in 1", sku: "BENAT-OIL-APPLICATOR-SCALP-MASSAGER", price: 25.99, stock: 100, desc: "A 2-in-1 electric oil applicator and vibration scalp massager that helps distribute hair and scalp oils while stimulating the scalp." },
  { category: "beauty-tools",      name: "Smart Scalp Massager",          sku: "BENAT-SMART-SCALP-MASSAGER",   price: 25.99, stock: 100, desc: "A handheld smart scalp massager that uses gentle vibration to stimulate the scalp, support relaxation, and promote circulation." },
  { category: "bath-body",         name: "2-Pack All-Natural, Plastic-Free Deodorants", sku: "BENAT-DEODORANT-2PACK", price: 13.64, stock: 100, desc: "A 2-pack of all-natural, plastic-free deodorants. Aluminium-free formula that keeps you fresh with clean, skin-friendly ingredients." },
  # ── Koriderm ──
  { category: "skincare",          name: "Koriderm Time Reverse Cream (All-In-One)", sku: "KORIDERM-TIME-REVERSE-CREAM", price: 18.74, stock: 100, desc: "An all-in-one anti-ageing face cream formulated to hydrate, firm, and smooth the look of fine lines for a more youthful, radiant complexion." },
  # ── PURSONIC USA ──
  { category: "skincare",          name: "Clear & Radiant Skin Bundle: Acne Foaming Wash", sku: "PURSONIC-CLEAR-RADIANT-ACNE-BUNDLE", price: 18.74, stock: 100, desc: "A clear-skin bundle centred on an acne foaming wash, formulated to cleanse blemish-prone skin and support a clearer, more radiant complexion." },
  { category: "beauty-tools",      name: "Pursonic LED Glow Set – 7-in-1 LED Light Therapy Face Mask + 7-in-1 LED Face & Neck Sculpting Wand", sku: "PURSONIC-LED-GLOW-SET", price: 82.49, stock: 100, desc: "A 7-in-1 LED light therapy set with a face mask and a face & neck sculpting wand, using multiple light modes to support skin rejuvenation at home." },
  { category: "health-wellness",   name: "Wireless Muscle Stimulator Pulse Massager", sku: "PURSONIC-WIRELESS-MUSCLE-STIMULATOR", price: 22.49, stock: 100, desc: "A wireless pulse massager that uses gentle electrical stimulation to help relax and relieve tired muscles." },
  { category: "health-wellness",   name: "Pursonic Rechargeable Abdominal Muscle Toner & Massager", sku: "PURSONIC-ABDOMINAL-MUSCLE-TONER", price: 29.99, stock: 100, desc: "A rechargeable abdominal muscle toner and massager that uses stimulation technology to help tone and relax the core muscles." },
  { category: "health-wellness",   name: "Pursonic Blood Glucose Test Strips Refill Kit – 50 Test Strips + 50 Sterile Lancets", sku: "PURSONIC-GLUCOSE-TEST-STRIPS-REFILL", price: 9.73, stock: 100, desc: "A blood glucose test strip refill kit including 50 test strips and 50 sterile lancets, for routine at-home glucose monitoring." }
]

# Original brand-store catalogue (local images under client/public/images/products).
extra_file = Rails.root.join("db/seeds/products_extra.yml")
products_data += (YAML.load_file(extra_file) || []).map(&:symbolize_keys) if File.exist?(extra_file)

# Shopify export — 164 products with live CDN image URLs.
shopify_file = Rails.root.join("db/seeds/shopify_export.yml")
products_data += (YAML.load_file(shopify_file) || []).map(&:symbolize_keys) if File.exist?(shopify_file)

products = products_data.map do |p|
  prod = Product.find_or_initialize_by(sku: p[:sku])
  # Use provided image_url from YAML, or look for local file, or keep existing
  image_url = p[:image_url]
  unless image_url
    img = Dir.glob(Rails.root.join("client/public/images/products", "#{p[:sku].downcase}.*")).first
    image_url = img ? "/images/products/#{File.basename(img)}" : prod.image_url
  end
  # Shipping confidence badge (USA & Canada only). Bulky/device/kit items
  # realistically ship slower → "expedited"; everything else is "fast".
  # Explicit p[:shipping] wins; otherwise inferred from the name.
  shipping = p[:shipping] ||
    (p[:name].to_s.match?(/massager|fascia gun|drill|\bLED\b|muscle|trolley|mannequin|gift set|syringe|stimulator|toner/i) ? "expedited" : "fast")

  prod.update!(
    product_category: prod_cats[p[:category]],
    name:             p[:name],
    price:            p[:price],
    stock_quantity:   p[:stock],
    description:      p[:desc],
    image_url:        image_url,
    gallery_urls:     Array(p[:gallery]),
    shipping_speed:   shipping,
    active:           true
  )
  prod
end

# Remove products no longer in the seed (leftovers from a previous catalog, e.g.
# old "Massage Oils" items). DELETE the ones with no order history; those that
# were ordered can't be destroyed (order_items are restrict_with_error) so we
# deactivate them instead, keeping order records intact.
keep_ids = products.map(&:id)
Product.where.not(id: keep_ids).left_joins(:order_items).where(order_items: { id: nil }).destroy_all
deactivated = Product.where.not(id: keep_ids).update_all(active: false) # survivors = had orders
puts "  cleaned up stale products (deactivated #{deactivated} with order history)"

# Now that stale products are gone, delete any leftover product categories from a
# previous schema (e.g. old "Massage Oils" / "Nail Care"). Only delete empty ones;
# a category that still has products (order-linked survivors) is deactivated so it
# drops off the shop without orphaning those products.
stale_cats = ProductCategory.where.not(id: current_category_ids)
stale_cats.left_joins(:products).where(products: { id: nil }).destroy_all
still_referenced = ProductCategory.where.not(id: current_category_ids)
still_referenced.update_all(active: false)
puts "  cleaned up stale product categories (deactivated #{still_referenced.count} still referenced)"

puts "  #{products.size} products (#{products.count { |x| x.image_url.present? }} with images)"

# ── Product colour/shade variants ─────────────────────────────────────────────
# Keyed by product SKU in db/seeds/product_variants.yml. Each variant carries its
# own swatch image and (optional) price override. Variants no longer listed are
# deactivated (kept if an order references them).
variants_file = Rails.root.join("db/seeds/product_variants.yml")
if File.exist?(variants_file)
  variant_data = YAML.load_file(variants_file) || {}
  total_variants = 0
  variant_data.each do |product_sku, variants|
    product = Product.find_by(sku: product_sku)
    unless product
      puts "  ! variants: no product for SKU #{product_sku}, skipping"
      next
    end
    seen = []
    Array(variants).each do |v|
      variant = ProductVariant.find_or_initialize_by(sku: v["sku"])
      variant.update!(
        product:        product,
        label:          v["label"],
        color_name:     v["color_name"],
        color_hex:      v["color_hex"],
        image_url:      v["image"],
        price:          v["price"],
        stock_quantity: v["stock"] || 0,
        position:       v["position"] || 0,
        active:         true
      )
      seen << variant.id
      total_variants += 1
    end
    product.product_variants.where.not(id: seen).update_all(active: false)
  end
  puts "  #{total_variants} product variants"
end

# ── Employees / technicians ───────────────────────────────────────────────────
# First names only. service_fsas recovered from the live booking coverage data.
employee_data = [
  { first: "Susi", email: "susi@baydspa.ca", title: "Nail Tech, Waxing and Massages", yrs: 28,
    photo: "/images/new-pics-for-the-ladies/susi-team-headshot.webp",
    bio: "Meet Susi, an exceptional entrepreneur and visionary in the world of beauty. With an impressive 28 years of unparalleled experience, Susi has earned a reputation as a trailblazer and an industry icon. Her unwavering dedication to excellence and her innovative approach to beauty services have established her as a formidable force in the market. Get ready to dive into the extraordinary journey of Susi, a true master of her craft.",
    lat: 43.5890, lng: -79.6441, specialties: %w[nails waxing massage spa], on_shift: true,
    fsas: %w[L7A L6X L6Y L6W L6V L6Z L6R L6S L5N L5W L5T L5M L5L L5K L5J L5H L5V L5R L5B L5G L5A L5E L5Y L5X L5P L4V L4T L5S L6M L6L L6J L6H L6K M9C M9B M9A M8W M8V M8Z M8X M8Y L9T M6S] },
  { first: "Claire", email: "claire@baydspa.ca", title: "Lash Artist for Mississauga", yrs: 17,
    photo: "/images/new-pics-for-the-ladies/claire-team-headshot.webp",
    bio: "Claire is a certified eyelash extension technician and coach since 2009, with extensive international experience across Europe and 8 years of expertise in Canada. She is a true master of her craft, skilled in all types of eyelash extensions and capable of creating any style or design tailored perfectly to each client. A devoted mother of three children, Claire now brings her expertise beyond her own home studio, providing professional, personalized eyelash services in clients' homes. With a passion for enhancing natural beauty, she combines precision, creativity, and professionalism in every appointment. Her extensive collection of diplomas and certificates reflects her commitment to excellence and continuous mastery of the latest techniques in eyelash artistry.",
    lat: 43.5453, lng: -79.5697, specialties: %w[lashes], on_shift: true,
    fsas: %w[L5N L5W L5T L5M L5L L5K L5J L5H L5V L5R L5B L5G L5A L5E L5Y L5X L5P L4V L4T L5S L6M L6L L6J L6H L6K] },
  { first: "Vanessa", email: "vanessa@baydspa.ca", title: "Nail Tech and Medical Pedicurist for Brampton", yrs: nil,
    photo: "/images/new-pics-for-the-ladies/vanessa-team-headshot.webp",
    bio: "Vanessa, a Certified Nail Technician & Medical Pedicurist proudly serving the Brampton area only. Vanessa is a certified nail technician and specialized medical pedicurist dedicated to helping clients feel confident and comfortable from the toes up. With advanced training in foot care and nail health, she offers more than just beauty, she provides relief for common foot concerns like calluses, ingrown nails, thickened nails, and dry, cracked heels. Trust your feet to a specialist who puts health, safety, and comfort first—Vanessa, Brampton's go-to for expert nail and foot care.",
    lat: 43.7315, lng: -79.7624, specialties: %w[nails], on_shift: true,
    fsas: %w[L7A L6X L6Y L6W L6V L6Z L6R L6S] },
  # Coverage left OPEN for now (widest set, mirrors Susi) so Rim is bookable
  # across the whole service area until her exact area is set. Base is central
  # Mississauga; adjust lat/lng + service_fsas once her home base is confirmed.
  { first: "Rim", email: "rim@baydspa.ca", title: "Medical Aesthetician - Facials, Skin Rejuvenation and Massage", yrs: 15,
    photo: "/images/new-pics-for-the-ladies/rim-team-headshot.webp",
    bio: "Rim, a Medical Aesthetician, believes that beautiful skin starts with personalized care. Her passion for aesthetics spans 15 years, during which she built a successful career in Kuwait helping clients achieve their ultimate skin goals. After relocating to Canada, she advanced her expertise by obtaining a Canadian diploma in Medical Aesthetics, ensuring her techniques align with the highest industry standards. Rim is known for her warm approach, thorough consultations, and ability to make clients feel completely at ease. Whether you are looking for advanced skin rejuvenation, a preventative skincare routine, or a relaxing massage, she is dedicated to guiding you every step of the way.",
    lat: 43.5890, lng: -79.6441, specialties: %w[spa massage], on_shift: true,
    fsas: %w[L7A L6X L6Y L6W L6V L6Z L6R L6S L5N L5W L5T L5M L5L L5K L5J L5H L5V L5R L5B L5G L5A L5E L5Y L5X L5P L4V L4T L5S L6M L6L L6J L6H L6K M9C M9B M9A M8W M8V M8Z M8X M8Y L9T M6S] }
]

employees = employee_data.map do |e|
  user = User.find_or_initialize_by(email: e[:email])
  # Shared temporary password for handover — tell each tech theirs out of band
  # and have them change it via the password-reset flow before going live. Only
  # set on FIRST creation: db:seed reruns on every deploy (see deploy.yml), so
  # setting this unconditionally would silently overwrite a real password the
  # tech has since changed, locking them out.
  user.password = "TempStaff2026!" if user.new_record?
  user.update!(first_name: e[:first], last_name: "", role: :employee)

  profile = EmployeeProfile.find_or_initialize_by(user: user)
  # on_shift is live app state (the tech's own clock-in/out toggle) — only seed
  # it on first creation, same reasoning as the password above: db:seed reruns
  # on every deploy and must never silently overwrite live shift status.
  profile.on_shift = e[:on_shift] if profile.new_record?
  profile.assign_attributes(
    title: e[:title], years_experience: e[:yrs], bio: e[:bio], photo_url: e[:photo],
    base_latitude: e[:lat], base_longitude: e[:lng], service_fsas: e[:fsas],
    active: true, dispatchable: true
  )
  profile.save!

  # Assign services matching the technician's specialty categories.
  profile.employee_services.destroy_all
  services.select { |svc| e[:specialties].include?(svc.service_category.slug) }
          .each   { |svc| EmployeeService.find_or_create_by!(employee_profile: profile, service: svc) }

  EmployeeCurrentLocation.find_or_initialize_by(employee_profile: profile).update!(
    latitude: e[:lat], longitude: e[:lng], recorded_at: Time.current
  )

  # Default bookable hours: Mon–Sat 9:00–19:00 (the real operating window).
  # Availability drives what customers can book, so every dispatchable tech needs a
  # schedule or they'd be unbookable. Updates existing rows too (not just on create)
  # so this narrows any previously-widened schedule back to real hours, and removes
  # any Sunday rows left from testing. Techs adjust their own hours via the
  # availability endpoints.
  AvailabilitySchedule.where(employee_profile: profile, day_of_week: 0).delete_all # drop testing Sunday rows
  (1..6).each do |dow| # 1=Mon .. 6=Sat (closed Sundays)
    sched = AvailabilitySchedule.find_or_initialize_by(employee_profile: profile, day_of_week: dow)
    sched.start_time = "09:00"
    sched.end_time   = "19:00"
    sched.save!
  end

  profile
end
puts "  #{employees.size} employee profiles"

# Offboard any technician no longer in the seed list (e.g. laid off). We never
# hard-delete a tech: their past bookings, shifts, and payouts must stay intact.
# Instead deactivate + make undispatchable + clear on_shift so they drop out of
# assignment, availability, and the public team, while history is preserved.
seeded_emails = employee_data.map { |e| e[:email] }
offboarded = EmployeeProfile.joins(:user)
                            .where.not(users: { email: seeded_emails })
                            .where(users: { role: "employee" })
offboarded.find_each do |profile|
  profile.update!(active: false, dispatchable: false, on_shift: false)
end
puts "  offboarded #{offboarded.count} former technician(s)" if offboarded.any?

# ── Admin ─────────────────────────────────────────────────────────────────────
User.find_or_create_by!(email: "bookings@baydspa.ca") do |u|
  u.first_name = "Admin"; u.last_name = "BAYD"; u.role = :admin; u.password = "adminpass123"
end
puts "  1 admin user (bookings@baydspa.ca)"

# ── Blog (imported from the transferred export — source URLs excluded) ────────
# Blog covers reuse our real work photos, matched by post category. The seed
# rotates through each pool so posts sharing a category get different images.
BLOG_COVER_IMAGES = {
  "Nail Care" => %w[/images/nails1.jpg /images/nails2.jpg /images/nails4.jpg /images/nails5.jpg /images/nails6.jpg /images/nails7.jpg],
  "Mobile Spa" => %w[/images/massage.jpg /images/massage1.jpg /images/massage2.jpg /images/Medicure1.jpg /images/pedicure1.jpg],
  "Skincare" => %w[/images/lashes3.jpg /images/lashes5.jpg],
  "Wellness" => %w[/images/pedicure2.jpg /images/pedicure3.jpg /images/massage2.jpg],
  "Services" => %w[/images/waxing.jpg /images/waxing2.jpg /images/waxing3.jpg],
  "News" => %w[/images/lashes1.jpg /images/nails4.jpg],
  "Beauty Tips" => %w[/images/lashes2.jpg /images/lashes4.jpg /images/lashes6.jpg /images/lashes7.jpg],
  "_default" => %w[/images/nails1.jpg /images/nails5.jpg /images/lashes2.jpg]
}.freeze

blog_export = Rails.root.join("db/seeds/blog_export.md")
if blog_export.exist?
  blog_author = User.find_by(email: "susi@baydspa.ca") || User.find_by(role: :admin)
  seeded_titles = []
  blog_cover_index = Hash.new(0) # per-category round-robin counter

  blog_export.read.split(/^\s*---\s*$/).each do |section|
    section = section.strip
    m = section.match(/\A##\s+\d+\.\s+(.+)/) # only numbered post sections
    next unless m

    title    = m[1].strip
    date_str = section[/^\*\*Date:\*\*\s*(.+)$/, 1].to_s
    published_at =
      begin
        Date.parse(date_str[/[A-Z][a-z]{2,8}\.?\s+\d{1,2},?\s+\d{4}/].to_s)
      rescue StandardError
        nil
      end

    # Body = content only; drop the title + metadata lines (URLs are never kept).
    body = section.lines.reject do |l|
      l.start_with?("## ") ||
        l.match?(/^\*\*(URL|Date|Read time|Author|Source|Status|Exported|Total posts)\b/i)
    end.join.strip
    # The blog renderer shows plain-text paragraphs (no markdown), so strip bold
    # markers and normalise dash bullets so nothing renders as literal syntax.
    body = body.gsub("**", "").gsub(/^[ \t]*-[ \t]+/, "• ")

    status  = body.blank? || body.match?(/Almost no body|Couldn.?t Find This Page/i) ? "draft" : "published"
    excerpt = body.gsub(/[*_#>•]/, " ").gsub(/\s+/, " ").strip[0, 180]

    # Categorise by topic (first keyword match wins) so the blog is filterable.
    category_rules = [
      [ "more than a service", "Wellness" ], [ "well-groomed", "Wellness" ],
      [ "manicures and pedicures for overall", "Wellness" ],
      [ "nail care for the elderly", "Nail Care" ], [ "gel-x", "Nail Care" ],
      [ "quality products", "Nail Care" ], [ "dipping powder", "Nail Care" ],
      [ "nail art", "Nail Care" ], [ "acrylic", "Nail Care" ],
      [ "hygiene", "Mobile Spa" ], [ "embrace relaxation", "Mobile Spa" ],
      [ "mobile spas after", "Mobile Spa" ], [ "new moms", "Mobile Spa" ],
      [ "spa services at home", "Mobile Spa" ],
      [ "microdermabrasion", "Skincare" ],
      [ "teeth whitening", "Services" ], [ "spray tan", "Services" ],
      [ "thanksgiving", "News" ], [ "covic", "News" ], [ "covid", "News" ]
    ]
    category = (category_rules.find { |kw, _| title.downcase.include?(kw) } || [ nil, "Beauty Tips" ]).last

    # Reuse our real work photos as blog covers, matched to the post's topic and
    # rotated so same-category posts don't repeat the same image. Falls back to a
    # general nails set for uncategorised posts.
    cover_pool = BLOG_COVER_IMAGES[category] || BLOG_COVER_IMAGES.fetch("_default")
    cover = cover_pool[blog_cover_index[category] % cover_pool.size] # wrap if more posts than images
    blog_cover_index[category] += 1

    post = BlogPost.find_or_initialize_by(title: title)
    post.update!(
      author:          blog_author,
      body:            body,
      excerpt:         excerpt,
      category:        category,
      status:          status,
      cover_image_url: cover,
      published_at:    published_at || post.published_at || Time.current
    )
    seeded_titles << title
  end

  # Remove any leftover demo/lorem posts that aren't part of the real export.
  BlogPost.where.not(title: seeded_titles).destroy_all if seeded_titles.any?
  puts "  #{seeded_titles.size} blog posts (#{BlogPost.published.count} published)"
end

# ── Gallery ───────────────────────────────────────────────────────────────────
[
  { title: "Mobile Lash Appointment",    category: "Lashes",   image: "/images/new-pics-for-the-ladies/mobile-lash-appointment-01.webp", size: "wide" },
  { title: "Polish Application",         category: "Nails",    image: "/images/new-pics-for-the-ladies/nail-polish-application-close-up.webp", size: "tall" },
  { title: "Mobile Nail Care",           category: "Pedicure", image: "/images/new-pics-for-the-ladies/mobile-nail-care-service-02.webp", size: "standard" },
  { title: "Gel Manicure Service",       category: "Nails",    image: "/images/new-pics-for-the-ladies/gel-manicure-service-01.webp", size: "wide" },
  { title: "Finished Manicure Result",   category: "Nails",    image: "/images/new-pics-for-the-ladies/finished-manicure-result-03.webp", size: "standard" },
  { title: "Technician at Work",         category: "Nails",    image: "/images/new-pics-for-the-ladies/nail-technician-at-work-02.webp", size: "wide" },
  { title: "Mobile Manicure Setup",      category: "Nails",    image: "/images/new-pics-for-the-ladies/mobile-manicure-service-03.webp", size: "standard" },
  { title: "Lash Service Detail",        category: "Lashes",   image: "/images/new-pics-for-the-ladies/mobile-lash-appointment-02.webp", size: "standard" },
  { title: "Soft Gel Finish",            category: "Nails",    image: "/images/new-pics-for-the-ladies/finished-manicure-result-01.webp", size: "standard" },
  { title: "Client Care Moment",         category: "Nails",    image: "/images/new-pics-for-the-ladies/manicure-client-moment-01.webp", size: "tall" },
  { title: "At-Home Appointment",        category: "Nails",    image: "/images/new-pics-for-the-ladies/mobile-manicure-appointment-01.webp", size: "tall" },
  { title: "Detailed Nail Care",         category: "Pedicure", image: "/images/new-pics-for-the-ladies/nail-care-service-close-up-01.webp", size: "standard" }
].each_with_index do |g, i|
  gi = GalleryItem.find_or_initialize_by(title: g[:title])
  gi.update!(
    category: g[:category],
    image_url: g[:image],
    image_alt: g[:title],
    size: g[:size],
    position: i,
    featured: i < 4,
    active: true
  )
end
puts "  22 gallery items"

# ── Job postings ──────────────────────────────────────────────────────────────
[
  { title: "Mobile Lash Artist", type: "full_time", dept: "Lashes", loc: "Greater Toronto Area",
    desc: "Deliver classic and volume lash services at clients' homes across the GTA.",
    req: "2+ years lash experience. Own transportation. Friendly, punctual, detail-oriented." },
  { title: "Mobile Nail Technician", type: "part_time", dept: "Nails", loc: "Mississauga & Brampton",
    desc: "Provide manicures and pedicures on location for our mobile clients.",
    req: "Certified nail tech. Weekend availability a plus." },
  { title: "Registered Massage Therapist", type: "contract", dept: "Massage", loc: "Toronto",
    desc: "Join our roster of mobile RMTs for in-home Swedish and deep tissue sessions.",
    req: "Valid RMT registration and insurance." },
  { title: "Beauty Operations Intern", type: "internship", dept: "Operations", loc: "Remote / Hybrid",
    desc: "Support scheduling, dispatch, and client care for a fast-growing mobile beauty brand.",
    req: "Organized, tech-savvy, currently studying business or related field." }
].each do |j|
  JobPosting.find_or_create_by!(title: j[:title]) do |p|
    p.employment_type = j[:type]; p.department = j[:dept]; p.location = j[:loc]
    p.description = j[:desc]; p.requirements = j[:req]
    p.status = "published"; p.posted_at = Time.current - rand(1..20).days
  end
end
puts "  4 job postings"

# ── Invoices / transactions backfill (idempotent; PDFs rendered inline) ────────
invoice_sources =
  Booking.where(status: "completed").order(starts_at: :desc).limit(15).to_a +
  Order.where(status: %w[paid shipped]).to_a +
  GiftCard.where.not(purchaser_id: nil).to_a

invoiced = 0
invoice_sources.each do |source|
  next if Invoice.exists?(invoiceable: source)

  invoice = Invoice.generate_for(source)
  GenerateInvoiceJob.new.perform(invoice.id) if invoice && !invoice.pdf.attached?
  invoiced += 1
rescue StandardError => e
  warn "  invoice backfill skipped for #{source.class}##{source.id}: #{e.message}"
end
puts "  #{invoiced} invoices generated (#{Invoice.count} total)"

puts "Done. Log in as bookings@baydspa.ca / adminpass123 (change this password before handing over)."
