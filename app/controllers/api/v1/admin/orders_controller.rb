module Api
  module V1
    module Admin
      class OrdersController < BaseController
        def index
          scope = Order.includes(:user, order_items: :product).order(created_at: :desc)
          scope = scope.where(status: params[:status]) if params[:status].present?
          records, meta = paginate(scope)
          render json: {
            data: records.as_json(include: { user: { only: %i[id email first_name last_name] },
                                             order_items: { include: { product: { only: %i[id name] } } } }),
            pagination: meta
          }
        end

        def show
          order = Order.includes(:user, order_items: :product).find(params[:id])
          render json: order.as_json(include: { user: { only: %i[id email first_name last_name] },
                                                order_items: { include: :product } })
        end

        def update
          order = Order.find(params[:id])
          order.update!(params.permit(:status, :tracking_number, :carrier))
          render json: order.as_json
        end

        def destroy
          Order.find(params[:id]).destroy!
          head :no_content
        end
      end
    end
  end
end
