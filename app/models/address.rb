class Address < ApplicationRecord
  belongs_to :user

  has_many :booking_requests, dependent: :nullify
  has_many :bookings, dependent: :nullify
  has_many :orders, foreign_key: :shipping_address_id, dependent: :nullify

  validates :line1, presence: true

  geocoded_by :full_address
  after_validation :geocode, if: :address_changed?

  def full_address
    [line1, line2, city, province, postal_code].compact.join(", ")
  end

  private

  def address_changed?
    line1_changed? || city_changed? || province_changed? || postal_code_changed?
  end
end
