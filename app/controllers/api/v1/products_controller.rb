module Api
  module V1
    class ProductsController < ApplicationController
      skip_before_action :authenticate_user!, only: %i[index show top_sellers]

      # Powers the rotating "recommend products" popup. Ranks by units actually
      # sold (paid/shipped orders). When the shop is new and there aren't enough
      # real sales, backfills with `featured` products, then newest in-stock — so
      # the widget is never empty. Returns up to `limit` (default 8).
      def top_sellers
        limit = (params[:limit].presence || 8).to_i.clamp(1, 24)
        base  = Product.active.in_stock.includes({ product_category: :parent }, :product_variants)

        sold_ids = OrderItem.joins(:order)
                            .where(orders: { status: %w[paid shipped] })
                            .group(:product_id).order(Arel.sql("SUM(quantity) DESC"))
                            .limit(limit).pluck(:product_id)

        ranked = base.where(id: sold_ids)
                     .sort_by { |p| sold_ids.index(p.id) } # preserve sales rank

        if ranked.size < limit
          fill = base.where(featured: true).where.not(id: ranked.map(&:id)).limit(limit - ranked.size)
          ranked += fill.to_a
        end
        if ranked.size < limit
          fill = base.where.not(id: ranked.map(&:id)).order(created_at: :desc).limit(limit - ranked.size)
          ranked += fill.to_a
        end

        render json: { data: ProductSerializer.render_as_hash(ranked) }
      end

      def index
        scope = Product.active.in_stock.includes({ product_category: :parent }, :product_variants)
        if params[:category_id].present?
          category = ProductCategory.find_by(id: params[:category_id])
          if category
            cat_ids = [ category.id ] + category.subcategories.pluck(:id)
            scope = scope.where(product_category_id: cat_ids)
          end
        end
        per = params[:per_page] || params[:per] || (params[:page].present? ? 25 : 500)
        records, meta = paginate(scope.order(:name), per: per.to_i)
        render json: { data: ProductSerializer.render_as_hash(records), pagination: meta }
      end

      def show
        product = Product.active.includes(:product_variants).find(params[:id])
        render json: ProductSerializer.render_as_hash(product)
      end
    end
  end
end
