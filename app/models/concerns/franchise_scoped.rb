# Row-level tenancy. Every query on a franchise-owned model is limited to
# Current.franchise, and new rows join it. With no franchise in context (a super
# admin's global console, cross-franchise jobs) queries see every franchise, so
# code running that way must set the franchise before creating anything.
module FranchiseScoped
  extend ActiveSupport::Concern

  included do
    belongs_to :franchise

    # The column's database default (Canada) is only for the previous release's
    # inserts during a deploy; here the franchise always comes from context.
    attribute :franchise_id, default: nil

    default_scope { (franchise = Current.franchise) ? where(franchise_id: franchise.id) : all }

    before_validation(on: :create) { self.franchise_id ||= Current.franchise&.id || Franchise.default.id }
  end
end
