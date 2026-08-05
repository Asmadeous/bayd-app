puts "Seeding..."

# ── Service areas (with admin-set coverage geometry) ──────────────────────────
AREA_DATA = {
  "mississauga" => { name: "Mississauga", fee: 0,     lat: 43.5890, lng: -79.6441, radius_km: 18 },
  "brampton"    => { name: "Brampton",    fee: 5.00,  lat: 43.7315, lng: -79.7624, radius_km: 16 },
  "toronto"     => { name: "Toronto",     fee: 10.00, lat: 43.6532, lng: -79.3832, radius_km: 22 }
}.freeze

areas = AREA_DATA.to_h do |slug, a|
  area = ServiceArea.find_or_initialize_by(slug: slug)
  area.update!(
    name: a[:name], travel_fee: a[:fee], active: true,
    center_latitude: a[:lat], center_longitude: a[:lng], radius_meters: a[:radius_km] * 1000
  )
  [ slug, area ]
end
puts "  #{areas.size} service areas (with coverage zones)"

# ── Service categories ────────────────────────────────────────────────────────
categories = {
  "nails"   => ServiceCategory.find_or_create_by!(slug: "nails")   { |c| c.name = "Nails";   c.position = 1 },
  "lashes"  => ServiceCategory.find_or_create_by!(slug: "lashes")  { |c| c.name = "Lashes";  c.position = 2 },
  "massage" => ServiceCategory.find_or_create_by!(slug: "massage") { |c| c.name = "Massage"; c.position = 3 },
  "waxing"  => ServiceCategory.find_or_create_by!(slug: "waxing")  { |c| c.name = "Waxing";  c.position = 4 },
  "spa"     => ServiceCategory.find_or_create_by!(slug: "spa")     { |c| c.name = "Spa";     c.position = 5 }
}
puts "  #{categories.size} service categories"

# ── Services ──────────────────────────────────────────────────────────────────
services_data = [
  { category: "nails",   name: "Classic Manicure",         duration: 45,  price: 45.00,  image: "/images/new-pics-for-the-ladies/mobile-manicure-service-01.webp" },
  { category: "nails",   name: "Gel Manicure",             duration: 60,  price: 65.00,  image: "/images/new-pics-for-the-ladies/gel-manicure-service-01.webp" },
  { category: "nails",   name: "Classic Pedicure",         duration: 60,  price: 55.00,  image: "/images/pedicure3.jpg" },
  { category: "nails",   name: "Gel Pedicure",             duration: 75,  price: 75.00,  image: "/images/pedicure2.jpg" },
  { category: "lashes",  name: "Classic Lash Extensions",  duration: 90,  price: 120.00, image: "/images/new-pics-for-the-ladies/mobile-lash-appointment-01.webp" },
  { category: "lashes",  name: "Volume Lash Extensions",   duration: 120, price: 160.00, image: "/images/new-pics-for-the-ladies/mobile-lash-appointment-02.webp" },
  { category: "lashes",  name: "Lash Fill",                duration: 60,  price: 75.00,  image: "/images/new-pics-for-the-ladies/mobile-lash-appointment-01.webp" },
  { category: "massage", name: "Swedish Massage (60 min)", duration: 60,  price: 90.00,  image: "/images/massage.jpg" },
  { category: "massage", name: "Deep Tissue Massage",      duration: 75,  price: 110.00, image: "/images/massage1.jpg" },
  { category: "waxing",  name: "Eyebrow Wax",              duration: 20,  price: 20.00,  image: "/images/new-pics-for-the-ladies/nail-technician-portrait-at-work-01.webp" },
  { category: "waxing",  name: "Lip Wax",                  duration: 15,  price: 15.00,  image: "/images/new-pics-for-the-ladies/nail-technician-portrait-at-work-02.webp" },
  { category: "waxing",  name: "Full Leg Wax",             duration: 45,  price: 60.00,  image: "/images/new-pics-for-the-ladies/nail-technician-portrait-at-work-03.webp" },
  { category: "spa",     name: "Mini Facial",              duration: 45,  price: 70.00,  image: "/images/lashes2.jpg" },
  { category: "spa",     name: "Signature Spa Package",    duration: 120, price: 180.00, image: "/images/lashes1.jpg" }
]

services = services_data.map do |s|
  svc = Service.find_or_initialize_by(name: s[:name])
  svc.update!(
    service_category: categories[s[:category]],
    duration_minutes: s[:duration],
    price: s[:price],
    image_url: s[:image]
  )
  svc
end
puts "  #{services.size} services"

# ── Product catalog ───────────────────────────────────────────────────────────
prod_cats = {
  "nail-care"    => ProductCategory.find_or_create_by!(slug: "nail-care")    { |c| c.name = "Nail Care";    c.position = 1 },
  "skincare"     => ProductCategory.find_or_create_by!(slug: "skincare")     { |c| c.name = "Skincare";     c.position = 2 },
  "massage-oils" => ProductCategory.find_or_create_by!(slug: "massage-oils") { |c| c.name = "Massage Oils"; c.position = 3 }
}

products = [
  { category: "nail-care",    name: "Cuticle Oil",          sku: "NC-001", price: 12.99, stock: 50 },
  { category: "nail-care",    name: "Gel Top Coat",         sku: "NC-002", price: 18.99, stock: 30 },
  { category: "skincare",     name: "Hydrating Face Mask",  sku: "SK-001", price: 24.99, stock: 25 },
  { category: "massage-oils", name: "Lavender Massage Oil", sku: "MO-001", price: 19.99, stock: 40 },
  { category: "massage-oils", name: "Eucalyptus Body Oil",  sku: "MO-002", price: 22.99, stock: 35 }
].map do |p|
  Product.find_or_create_by!(sku: p[:sku]) do |prod|
    prod.product_category = prod_cats[p[:category]]
    prod.name             = p[:name]
    prod.price            = p[:price]
    prod.stock_quantity   = p[:stock]
  end
end
puts "  #{products.size} products"

# ── Employees (rich profiles) ─────────────────────────────────────────────────
employee_data = [
  { first: "Susi",    last: "Tran",    email: "susi@bayd.local",    title: "Lead Lash Artist",     yrs: 7, lat: 43.5890, lng: -79.6441, areas: %w[mississauga toronto], photo: "/images/lashes3.jpg", on_shift: true },
  { first: "Claire",  last: "Bennett", email: "claire@bayd.local",  title: "Nail Technician",      yrs: 4, lat: 43.5453, lng: -79.5697, areas: %w[mississauga],         photo: "/images/nails1.jpg",  on_shift: true },
  { first: "Vanessa", last: "Okafor",  email: "vanessa@bayd.local", title: "Massage Therapist",    yrs: 9, lat: 43.7315, lng: -79.7624, areas: %w[brampton],            photo: "/images/massage.jpg", on_shift: false },
  { first: "Dana",    last: "Price",   email: "dana@bayd.local",    title: "Esthetician & Waxing", yrs: 5, lat: 43.6532, lng: -79.3832, areas: %w[toronto mississauga], photo: "/images/lashes7.jpg", on_shift: true }
]

employees = employee_data.map do |e|
  user = User.find_or_initialize_by(email: e[:email])
  user.update!(first_name: e[:first], last_name: e[:last], role: :employee, password: "password123")

  profile = EmployeeProfile.find_or_initialize_by(user: user)
  profile.update!(
    title: e[:title], years_experience: e[:yrs], photo_url: e[:photo],
    bio: "#{e[:first]} is a #{e[:title].downcase} with #{e[:yrs]} years of experience delivering premium mobile beauty services.",
    base_latitude: e[:lat], base_longitude: e[:lng],
    active: true, dispatchable: true, on_shift: e[:on_shift]
  )

  e[:areas].each { |slug| EmployeeServiceArea.find_or_create_by!(employee_profile: profile, service_area: areas[slug]) }
  services.each  { |svc|  EmployeeService.find_or_create_by!(employee_profile: profile, service: svc) }

  # Fresh live location so the dispatch map has something to show.
  EmployeeCurrentLocation.find_or_initialize_by(employee_profile: profile).update!(
    latitude: e[:lat], longitude: e[:lng], recorded_at: Time.current
  )
  profile
end
puts "  #{employees.size} employee profiles"

# ── Admin ─────────────────────────────────────────────────────────────────────
User.find_or_create_by!(email: "admin@bayd.local") do |u|
  u.first_name = "Admin"; u.last_name = "BAYD"; u.role = :admin; u.password = "adminpass123"
end
puts "  1 admin user (admin@bayd.local / adminpass123)"

# ── Customers ─────────────────────────────────────────────────────────────────
customer_data = [
  { first: "Maya",     last: "Johnson",  email: "maya@example.com",     lat: 43.5900, lng: -79.6440 },
  { first: "Priya",    last: "Sharma",   email: "priya@example.com",    lat: 43.6010, lng: -79.6500 },
  { first: "Olivia",   last: "Martin",   email: "olivia@example.com",   lat: 43.6532, lng: -79.3832 },
  { first: "Sophie",   last: "Nguyen",   email: "sophie@example.com",   lat: 43.7000, lng: -79.7400 },
  { first: "Amara",    last: "Bello",    email: "amara@example.com",    lat: 43.5500, lng: -79.5700 },
  { first: "Chloe",    last: "Davis",    email: "chloe@example.com",    lat: 43.6600, lng: -79.4000 },
  { first: "Hannah",   last: "Kim",      email: "hannah@example.com",   lat: 43.6100, lng: -79.6200 },
  { first: "Isabella", last: "Rossi",    email: "isabella@example.com", lat: 43.7200, lng: -79.7500 }
]

customers = customer_data.map do |c|
  user = User.find_or_initialize_by(email: c[:email])
  user.update!(first_name: c[:first], last_name: c[:last], role: :customer, password: "password123",
               marketing_opt_in: true, phone: "+1416555#{format('%04d', rand(0..9999))}")
  Address.find_or_create_by!(user: user, line1: "#{rand(10..990)} Lakeshore Rd") do |a|
    a.label = "Home"; a.city = "Mississauga"; a.province = "ON"
    a.postal_code = "L5B #{rand(1..9)}A#{rand(1..9)}"
    a.latitude = c[:lat]; a.longitude = c[:lng]; a.default = true
  end
  user
end
puts "  #{customers.size} customers (password: password123)"

# Referrals — link a couple of customers to a referrer.
customers[1].update!(referred_by: customers[0]) if customers[1].referred_by_id.nil?
customers[4].update!(referred_by: customers[0]) if customers[4].referred_by_id.nil?

# ── Transactional demo data (only when empty, so re-seeding won't duplicate) ───
if Booking.count.zero?
  puts "  generating bookings, reviews, orders, loyalty…"

  REVIEW_BODIES = [
    "Absolutely loved it — so convenient and professional!",
    "Great service, will definitely book again.",
    "On time and did a beautiful job.",
    "Relaxing and worth every penny.",
    "Friendly and skilled. Highly recommend.",
    "Perfect results, exactly what I wanted."
  ].freeze

  completed_count = 0
  review_count = 0

  # ~70 completed bookings spread across the last 90 days.
  70.times do
    cust = customers.sample
    emp  = employees.sample
    svc  = services.sample
    addr = cust.addresses.first
    days_ago = rand(1..90)
    starts = (Time.current - days_ago.days).change(hour: rand(9..17), min: [ 0, 30 ].sample)

    booking = Booking.create!(
      user: cust, employee_profile: emp, service: svc, address: addr,
      starts_at: starts, ends_at: starts + svc.duration_minutes.minutes,
      subtotal: svc.price, travel_fee: 0, total: svc.price, status: "completed",
      service_latitude: addr.latitude, service_longitude: addr.longitude
    )
    completed_count += 1

    booking.payments.create!(amount: booking.total, status: "paid",
                             method: %w[card cash].sample, processor: "square", paid_at: starts)

    account = cust.loyalty_account || cust.create_loyalty_account
    account.earn!(booking.total.to_f.floor, booking: booking, description: "Service: #{svc.name}")

    next unless rand < 0.55

    Review.create!(
      user: cust, booking: booking, employee_profile: emp,
      rating: [ 5, 5, 5, 4, 4, 3 ].sample,
      body: REVIEW_BODIES.sample,
      approved: rand < 0.8,
      featured: rand < 0.15,
      created_at: starts + 1.day
    )
    review_count += 1
  end

  # ~18 upcoming confirmed bookings (next 30 days).
  18.times do
    cust = customers.sample
    emp  = employees.sample
    svc  = services.sample
    addr = cust.addresses.first
    starts = (Time.current + rand(1..30).days).change(hour: rand(9..17), min: [ 0, 30 ].sample)
    Booking.create!(
      user: cust, employee_profile: emp, service: svc, address: addr,
      starts_at: starts, ends_at: starts + svc.duration_minutes.minutes,
      subtotal: svc.price, travel_fee: 0, total: svc.price, status: "confirmed",
      service_latitude: addr.latitude, service_longitude: addr.longitude
    )
  end

  # A few cancellations / no-shows so completion-rate KPIs are realistic.
  8.times do
    cust = customers.sample
    emp  = employees.sample
    svc  = services.sample
    starts = (Time.current - rand(1..60).days).change(hour: rand(9..17))
    Booking.create!(
      user: cust, employee_profile: emp, service: svc, address: cust.addresses.first,
      starts_at: starts, ends_at: starts + svc.duration_minutes.minutes,
      subtotal: svc.price, travel_fee: 0, total: svc.price,
      status: %w[cancelled no_show].sample, cancellation_reason: "Customer rescheduled"
    )
  end
  puts "    #{completed_count} completed, 18 upcoming, 8 cancelled/no-show · #{review_count} reviews"

  # ── Subscription + auto-charge demo (Maya) ─────────────────────────────────
  maya = customers[0]
  maya.update!(moneris_data_key: "key_demo_maya", card_brand: "Visa", card_last4: "4242")
  gel = services.find { |s| s.name == "Gel Manicure" } || services.first
  emp = employees[1]
  last_start = (Time.current - 14.days).change(hour: 11)
  last_booking = Booking.create!(
    user: maya, employee_profile: emp, service: gel, address: maya.addresses.first,
    starts_at: last_start, ends_at: last_start + gel.duration_minutes.minutes,
    subtotal: gel.price, travel_fee: 0, total: gel.price, status: "completed",
    service_latitude: maya.addresses.first.latitude, service_longitude: maya.addresses.first.longitude
  )
  sub = Subscription.create!(
    user: maya, service: gel, address: maya.addresses.first,
    interval_unit: "week", interval_count: 2, auto_charge: true, status: "active", price: gel.price,
    started_at: last_start, last_booking_at: last_start,
    next_run_at: (last_start + 2.weeks)
  )
  last_booking.update!(subscription: sub)
  puts "    subscription demo for #{maya.first_name} (Gel Manicure every 2 weeks, auto-charged)"

  # ── Notifications for the demo customer ────────────────────────────────────
  app_url = ENV.fetch("APP_URL", "http://localhost:3001")
  [
    { kind: "recurring_booked", title: "Your next Gel Manicure is booked",
      body: "We automatically scheduled your next appointment.", url: "#{app_url}/dashboard/customer/bookings", read: false },
    { kind: "review_request", title: "How was your Gel Manicure?",
      body: "Rate your technician and earn bonus points.", url: "#{app_url}/dashboard/customer/bookings", read: false, cta: "Leave a review" },
    { kind: "loyalty_earned", title: "You earned 65 loyalty points",
      body: "Thanks for booking with us!", url: "#{app_url}/dashboard/customer/loyalty", read: true },
    { kind: "rebook_nudge", title: "Loved your service? Book it again",
      body: "Rebook or set it to repeat automatically.", url: "#{app_url}/dashboard/customer/book", read: true, cta: "Rebook now" }
  ].each do |n|
    Notification.create!(user: maya, kind: n[:kind], title: n[:title], body: n[:body],
                         action_url: n[:url], read_at: n[:read] ? Time.current : nil,
                         metadata: n[:cta] ? { "cta" => n[:cta] } : {})
  end
  puts "    4 notifications for #{maya.first_name}"

  # ── Orders ─────────────────────────────────────────────────────────────────
  12.times do
    cust = customers.sample
    order = Order.create!(user: cust, status: "pending", created_at: Time.current - rand(1..60).days)
    rand(1..3).times do
      prod = products.sample
      order.order_items.create!(product: prod, quantity: rand(1..3), price: prod.price, name: prod.name)
    end
    order.recalculate_total!
    order.update!(status: %w[paid paid shipped pending].sample)
    order.payments.create!(amount: order.total, status: "paid", method: "card", processor: "square", paid_at: order.created_at) if order.paid? || order.shipped?
  end
  puts "    12 product orders"

  # ── Gift cards ─────────────────────────────────────────────────────────────
  [ [ 50, 50 ], [ 100, 75 ], [ 150, 150 ] ].each do |initial, current|
    GiftCard.create!(purchaser: customers.sample,
                     initial_balance: initial, current_balance: current,
                     recipient_email: customers.sample.email, active: true)
  end
  puts "    3 gift cards"
else
  puts "  bookings already present — skipping transactional demo data"
end

# ── Gallery ───────────────────────────────────────────────────────────────────
[
  { title: "Ready to Come to You",       category: "Team",     image: "/images/new-pics-for-the-ladies/beauty-team-group-portrait-06.webp", size: "wide" },
  { title: "Mobile Lash Appointment",    category: "Lashes",   image: "/images/new-pics-for-the-ladies/mobile-lash-appointment-01.webp", size: "wide" },
  { title: "Polish Application",         category: "Nails",    image: "/images/new-pics-for-the-ladies/nail-polish-application-close-up.webp", size: "tall" },
  { title: "Mobile Nail Care",           category: "Pedicure", image: "/images/new-pics-for-the-ladies/mobile-nail-care-service-02.webp", size: "standard" },
  { title: "Lead Experience",            category: "Team",     image: "/images/new-pics-for-the-ladies/susi-team-portrait-01.webp", size: "standard" },
  { title: "Gel Manicure Service",       category: "Nails",    image: "/images/new-pics-for-the-ladies/gel-manicure-service-01.webp", size: "wide" },
  { title: "Specialized Foot Care",      category: "Team",     image: "/images/new-pics-for-the-ladies/vanessa-team-portrait-01.webp", size: "standard" },
  { title: "Finished Manicure Result",   category: "Nails",    image: "/images/new-pics-for-the-ladies/finished-manicure-result-03.webp", size: "standard" },
  { title: "Technician at Work",         category: "Nails",    image: "/images/new-pics-for-the-ladies/nail-technician-at-work-02.webp", size: "wide" },
  { title: "Service Preparation",        category: "Team",     image: "/images/new-pics-for-the-ladies/nail-technician-portrait-at-work-02.webp", size: "tall" },
  { title: "Mobile Manicure Setup",      category: "Nails",    image: "/images/new-pics-for-the-ladies/mobile-manicure-service-03.webp", size: "standard" },
  { title: "Detail and Creativity",      category: "Team",     image: "/images/new-pics-for-the-ladies/dana-team-portrait-01.webp", size: "standard" },
  { title: "Lash Service Detail",        category: "Lashes",   image: "/images/new-pics-for-the-ladies/mobile-lash-appointment-02.webp", size: "standard" },
  { title: "Soft Gel Finish",            category: "Nails",    image: "/images/new-pics-for-the-ladies/finished-manicure-result-01.webp", size: "standard" },
  { title: "Prepared Professionals",     category: "Team",     image: "/images/new-pics-for-the-ladies/beauty-team-group-portrait-04.webp", size: "wide" },
  { title: "Client Care Moment",         category: "Nails",    image: "/images/new-pics-for-the-ladies/manicure-client-moment-01.webp", size: "tall" },
  { title: "At-Home Appointment",        category: "Nails",    image: "/images/new-pics-for-the-ladies/mobile-manicure-appointment-01.webp", size: "tall" },
  { title: "Detailed Nail Care",         category: "Pedicure", image: "/images/new-pics-for-the-ladies/nail-care-service-close-up-01.webp", size: "standard" },
  { title: "Mobile Beauty Team",         category: "Team",     image: "/images/new-pics-for-the-ladies/beauty-team-group-portrait-01.webp", size: "wide" }
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

# ── Blog ──────────────────────────────────────────────────────────────────────
author = User.find_by(role: :admin)
[
  { title: "5 Lash Aftercare Tips", excerpt: "Keep your extensions flawless for weeks.", cover: "/images/lashes1.jpg" },
  { title: "Why Mobile Beauty Is the Future", excerpt: "Salon-quality service at your door.", cover: "/images/massage.jpg" },
  { title: "Gel vs Classic Manicure", excerpt: "Which one is right for you?", cover: "/images/nails1.jpg" }
].each do |b|
  BlogPost.find_or_create_by!(title: b[:title]) do |post|
    post.author = author; post.excerpt = b[:excerpt]
    post.body = "#{b[:excerpt]}\n\nLorem ipsum dolor sit amet, consectetur adipiscing elit. " * 6
    post.cover_image_url = b[:cover]; post.status = "published"; post.published_at = Time.current - rand(1..40).days
  end
end
puts "  3 blog posts"

# ── Newsletter + inbound inquiries ────────────────────────────────────────────
%w[fan1@example.com fan2@example.com fan3@example.com].each do |em|
  NewsletterSubscriber.find_or_create_by!(email: em)
end
ContactMessage.find_or_create_by!(email: "lead@example.com") do |m|
  m.name = "Jordan Lee"; m.message = "Do you service the Oakville area?"
end
FranchiseInquiry.find_or_create_by!(email: "investor@example.com") do |f|
  f.name = "Sam Carter" if f.respond_to?(:name=)
end
JobApplication.find_or_create_by!(email: "applicant@example.com") do |j|
  j.name = "Riley Adams"
end
puts "  newsletter + inquiries"

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

puts "Done. Log in as admin@bayd.local / adminpass123 or maya@example.com / password123"
