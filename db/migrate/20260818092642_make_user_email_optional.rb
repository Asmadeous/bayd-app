class MakeUserEmailOptional < ActiveRecord::Migration[8.1]
  def change
    # A booking can now be made with phone only (no email) — see
    # ApplicationController#find_or_create_customer. Postgres unique indexes
    # already allow multiple NULLs, so existing accounts/uniqueness are
    # unaffected; this only removes the NOT NULL constraint.
    change_column_null :users, :email, true

    # Phone becomes a second lookup key for phone-only accounts. NOT unique —
    # real phone numbers get shared (a household, a mistyped digit) or
    # reassigned over time, so we look up "most recent match" rather than
    # enforce one-account-per-number. An index still keeps that lookup fast.
    add_index :users, :phone
  end
end
