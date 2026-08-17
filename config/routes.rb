Rails.application.routes.draw do
  get "up" => "rails/health#show", as: :rails_health_check

  namespace :api do
    namespace :v1 do
      # Auth
      post  "auth/register",   to: "auth#register"
      post  "auth/login",      to: "auth#login"
      post  "auth/staff_login", to: "auth#staff_login"
      get   "auth/me",       to: "auth#me"
      patch "auth/me",       to: "auth#update_me"
      get   "auth/google",          to: "google_auth#start"
      get   "auth/google/callback", to: "google_auth#callback"

      # Catalog (public)
      resources :service_categories, only: :index
      resources :services,           only: %i[index show]
      resources :product_categories, only: %i[index show]
      resources :products, only: %i[index show] do
        collection { get :top_sellers } # rotating recommend-products widget
      end

      # Booking flow
      resources :booking_requests, only: %i[index show create]
      resources :bookings, only: %i[index show] do
        member do
          post :cancel
          post :pay
        end
      end

      # Out-of-area enquiry (no tech covers the postal code → request a callback)
      resources :callback_requests, only: :create

      # Customer resources
      resources :addresses
      resources :reviews, only: %i[index create]
      get "loyalty", to: "loyalty#show"

      # Invoices / transactions (customer)
      resources :invoices, only: %i[index show] do
        member { get :download }
      end

      # Card on file (Square) — single card per customer, for booking/subscription auto-charge
      resource :payment_method, only: %i[show create destroy], controller: "payment_methods"

      # Notifications
      resources :notifications, only: :index do
        member     { post :read }
        collection { post :read_all }
      end

      # Referral program
      resource :referral, only: :show, controller: "referrals"

      # Service subscriptions (customer-managed)
      resources :subscriptions, only: %i[index show] do
        member do
          post :pause
          post :resume
          post :cancel
          post :skip
          post :change_frequency
        end
      end

      # Gift cards
      resources :gift_cards, only: %i[index show create], param: :code do
        member do
          post :redeem
          post :topup
        end
      end

      # Gallery (public read)
      resources :gallery_items, only: :index

      # Team (public — staff profiles + reviews)
      resources :team, only: %i[index show], controller: "team"

      # Careers / job board (public)
      resources :jobs, only: %i[index show], param: :slug do
        member { post :apply }
      end

      # Service-area coverage check (public — "do we serve this address?")
      get "coverage", to: "coverage#show"

      # Technician availability (public — "what times are open?"): free slots for a
      # service+tech+date, sourced from SimplyBook's provider schedule.
      get "availability", to: "availability#show"
      # Every eligible tech's open times for a service+date, so the booking form
      # can auto-shift to another available tech when the chosen one is full.
      get "availability/any", to: "availability#any"

      # Country gate (public — "do we accept requests from your country?")
      get "geo", to: "geo#show"

      # Address verification (public — geocode the typed address and confirm it's
      # a real Canadian address before letting the booking form proceed).
      post "geo/verify_address", to: "geo#verify_address"

      # Shop & checkout
      resources :orders, only: %i[index show create]
      post "checkout", to: "checkout#create"

      # Blog (public read)
      resources :blog_posts, only: %i[index show], param: :slug do
        resources :blog_comments, only: %i[index create], shallow: true
      end

      # Newsletter
      post "newsletter/subscribe",   to: "newsletter_subscribers#create"
      get  "newsletter/unsubscribe", to: "newsletter_subscribers#unsubscribe"

      # Inbound forms (public)
      post "contact",   to: "inbound_forms#contact"
      post "franchise", to: "inbound_forms#franchise"
      post "careers",   to: "inbound_forms#job"

      # Employee self-service
      scope :employee do
        get    "profile",       to: "employees#show"
        patch  "profile",       to: "employees#update"
        post   "toggle_shift",  to: "employees#toggle_shift"
        get    "schedule",      to: "employees#schedule"
        get    "reviews",       to: "employees#reviews"
        # Time clock (clock in/out with GPS → fuel-compensation mileage)
        post   "clock_in",      to: "employees#clock_in"
        post   "clock_out",     to: "employees#clock_out"
        get    "current_shift", to: "employees#current_shift"
        get    "shifts",        to: "employees#shifts"
        # Gift-card top-up at the customer (POS/cash → mark paid)
        get    "gift_cards/:code",       to: "employees#show_gift_card"
        post   "gift_cards/:code/topup", to: "employees#topup_gift_card"
        # Overtime charge when a service runs over its allocated time
        post   "bookings/:id/overtime",  to: "employees#booking_overtime"
        # Staff-initiated manual booking (force-book, skips eligibility gates)
        post   "bookings",               to: "employees#create_booking"
      end

      # Work-scope video calls (customer ↔ staff)
      resources :meetings, only: %i[show] do
        member do
          post :complete
          post :cancel
        end
      end
      resources :bookings, only: [] do
        resource :meeting, only: %i[create], controller: "meetings"
      end

      # Webhooks
      namespace :webhooks do
        post "traccar",    to: "traccar#positions"
        post "simplybook", to: "simplybook#receive"
        # Path must NOT contain "helcim" — Helcim rejects such webhook URLs (400).
        post "hpay",       to: "helcim#receive"
        post "square",     to: "square#receive"
      end

      # Admin
      namespace :admin do
        # Analytics / KPIs
        get "analytics", to: "analytics#show"

        # People
        resources :employees, only: %i[index show create update destroy] do
          member do
            post :toggle_shift
            post :toggle_dispatch
            get  :analytics
          end
        end
        resources :users, only: %i[index show update destroy]

        # Careers
        resources :job_postings, only: %i[index show create update destroy]
        resources :job_applications, only: %i[index show update destroy] do
          member { get "documents/:doc_id", action: :document, as: :document }
        end

        resources :subscriptions, only: %i[index show update destroy] do
          member { post :cancel }
        end

        # Bookings & scheduling
        resources :bookings,            only: %i[index show update destroy] do
          member do
            post  :payment_link
            get   :candidates      # eligible staff ranked by proximity
            patch :assign          # (re)assign to a technician
          end
        end
        resources :booking_requests,    only: %i[index show]
        resources :assignment_attempts, only: %i[index show]

        # Out-of-area callback queue
        resources :callback_requests, only: %i[index update]

        # Live staff locations + travel/fuel metrics (server-rendered map)
        get "staff_locations", to: "staff_locations#index"

        # Tip payout tracking (owed per technician)
        resources :tips, only: :index do
          collection { post :payout }
        end

        # Admin-editable settings (group deposit %, …)
        get   "settings", to: "settings#index"
        patch "settings", to: "settings#update"

        # Staff time clock / fuel-compensation report
        resources :shifts,   only: %i[index show destroy]
        resources :meetings, only: %i[index show destroy]

        # Partnerships — partner businesses supplying providers, and their payouts
        resources :partners, only: %i[index show create update destroy] do
          member do
            get  :detail
            post :settle
          end
        end
        resources :partner_payouts, only: :index do
          member { post :mark_paid }
        end

        # Catalog
        resources :service_categories,  only: %i[index create update destroy]
        resources :services,            only: %i[index create update destroy]
        resources :product_categories,  only: %i[index create update destroy]
        resources :products,            only: %i[index create update destroy]

        # Commerce
        resources :orders,    only: %i[index show update destroy]
        resources :invoices, only: %i[index show create update destroy] do
          member do
            get  :download
            post :resend
          end
        end
        resources :gift_cards, only: %i[index show create update destroy] do
          member do
            post :deliver
            post :topup
          end
        end
        resources :loyalty,   only: %i[index show]

        # Reviews & areas
        resources :reviews,       only: %i[index destroy] do
          member { post :approve; post :feature }
        end
        resources :service_areas, only: %i[index create update destroy]

        # Blog (full CRUD)
        resources :blog_posts, only: %i[index show create update destroy] do
          member { post :publish; post :unpublish }
          resources :blog_comments, only: %i[index destroy] do
            member { post :approve }
          end
        end

        # Gallery
        resources :gallery_items, only: %i[index show create update destroy]

        # Newsletter
        resources :newsletter_subscribers, only: %i[index destroy]

        # Inquiries
        get   "inquiries/franchise",     to: "inquiries#franchise"
        get   "inquiries/jobs",          to: "inquiries#jobs"
        get   "inquiries/contacts",      to: "inquiries#contacts"
        patch "inquiries/franchise/:id", to: "inquiries#update_franchise"
        patch "inquiries/jobs/:id",      to: "inquiries#update_job"
      end
    end
  end
end
