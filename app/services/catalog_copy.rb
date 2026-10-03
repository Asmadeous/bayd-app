# Copies a franchise's service menu (categories and services, with prices and
# photos) into another franchise as its starting catalog. Anything the target
# already has (same category slug / service name) is left alone, so it can be
# run again safely. The target then sets its own local prices.
class CatalogCopy
  def self.call(from:, to:) = new(from, to).call

  def initialize(from, to)
    @from = from
    @to = to
  end

  def call
    source = Current.set(franchise: @from) do
      ServiceCategory.includes(services: { image_attachment: :blob }).map { |c| [ c, c.services.to_a ] }
    end

    copied = 0
    Current.set(franchise: @to) do
      ActiveRecord::Base.transaction do
        source.each do |category, services|
          target = ServiceCategory.find_by(slug: category.slug) ||
                   ServiceCategory.create!(category.attributes.except("id", "franchise_id", "created_at", "updated_at"))
          services.each do |service|
            next if Service.exists?(service_category: target, name: service.name)

            copy = Service.create!(service.attributes.except("id", "franchise_id", "service_category_id", "created_at", "updated_at")
                                          .merge("service_category_id" => target.id))
            copy.image.attach(service.image.blob) if service.image.attached?
            copied += 1
          end
        end
      end
    end
    copied
  end
end
