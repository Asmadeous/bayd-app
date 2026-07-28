module Api
  module V1
    class OrdersController < ApplicationController
      def index
        records, meta = paginate(current_user.orders.order(created_at: :desc))
        render json: { data: OrderSerializer.render_as_hash(records), pagination: meta }
      end

      def show
        render json: OrderSerializer.render_as_hash(scoped_order)
      end

      def create
        order = current_user.orders.create!(shipping_address_id: params.dig(:order, :shipping_address_id))
        Array(params.dig(:order, :items)).each do |item|
          product = Product.active.in_stock.find(item[:product_id])
          order.order_items.create!(product: product, quantity: item[:quantity])
        end
        order.recalculate_total!
        render json: OrderSerializer.render_as_hash(order.reload), status: :created
      end

      private

      def scoped_order = current_user.orders.find(params[:id])
    end
  end
end
