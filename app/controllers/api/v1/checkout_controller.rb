module Api
  module V1
    # Online shopping checkout — Helcim, backend-driven.
    # Creates a pending Order + a hosted payment session, and returns the gateway
    # hosted-page URL for the frontend to redirect to. The order is marked paid
    # by the Helcim webhook (see Webhooks::HelcimController) — never by the client.
    class CheckoutController < ApplicationController
      def create
        items = Array(params[:items])
        return render json: { error: "Cart is empty" }, status: :unprocessable_entity if items.empty?

        order = current_user.orders.create!(status: "pending")
        items.each do |item|
          product = Product.active.in_stock.find(item[:product_id])
          order.order_items.create!(product: product, quantity: item[:quantity].to_i.clamp(1, 99))
        end
        order.recalculate_total!

        gateway = (params[:gateway].presence || ENV.fetch("CHECKOUT_GATEWAY", "helcim")).to_s.downcase
        url = gateway == "square" ? square_url(order) : helcim_url(order)
        return if performed? # a gateway error already rendered

        return fail_checkout(order, "Hosted checkout not configured") if url.blank?
        render json: { redirect_url: url, order_id: order.id, gateway: gateway }
      end

      private

      def helcim_url(order)
        session = HelcimService.initialize_session(
          payment_type: "purchase", amount: order.total.to_f.round(2), invoice_number: "ORD-#{order.id}"
        )
        return fail_checkout(order, session[:error]) && nil unless session[:success]

        HelcimService.hosted_url(session[:checkout_token])
      end

      def square_url(order)
        result = SquareService.create_checkout(order, redirect_url: "#{app_url}/checkout/confirmation")
        return fail_checkout(order, result[:error]) && nil unless result[:success]

        result[:url]
      end

      def app_url = ENV.fetch("APP_URL", "http://localhost:3001")

      def fail_checkout(order, error)
        order.destroy
        render json: { error: error }, status: :unprocessable_entity
      end
    end
  end
end
