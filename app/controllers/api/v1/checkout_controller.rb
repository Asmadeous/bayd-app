module Api
  module V1
    # Online shopping checkout — backend-driven.
    #   • Helcim → HelcimPay.js: returns a checkout_token; the frontend renders the
    #     pay modal with it. The order is marked paid by the Helcim webhook
    #     (Webhooks::HelcimController) — authoritative, never by the client.
    #   • Square → hosted checkout: returns a redirect_url the browser goes to.
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
        gateway == "square" ? render_square(order) : render_helcim(order)
      end

      private

      # HelcimPay.js: hand the checkout token to the frontend to open the modal.
      def render_helcim(order)
        session = HelcimService.initialize_session(
          payment_type: "purchase", amount: order.total.to_f.round(2), invoice_number: "ORD-#{order.id}"
        )
        return fail_checkout(order, session[:error]) unless session[:success]
        return fail_checkout(order, "Helcim did not return a checkout token") if session[:checkout_token].blank?

        render json: { gateway: "helcim", order_id: order.id, checkout_token: session[:checkout_token] }
      end

      # Square hosted checkout: browser redirects to the returned URL.
      def render_square(order)
        url = square_url(order)
        return if performed? # a gateway error already rendered
        return fail_checkout(order, "Hosted checkout not configured") if url.blank?

        render json: { gateway: "square", order_id: order.id, redirect_url: url }
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
