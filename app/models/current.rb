# Per-request (and per-job) context. `franchise` scopes every franchise-owned
# query (FranchiseScoped); nil means "no franchise chosen", which only a super
# admin's global console and cross-franchise jobs ever run with.
class Current < ActiveSupport::CurrentAttributes
  attribute :franchise
end
