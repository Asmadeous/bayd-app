module Api
  module V1
    module Admin
      class InvoicesController < BaseController
        def index
          scope = Invoice.includes(:user).recent
          scope = scope.where(status: params[:status]) if params[:status].present?
          scope = scope.where(kind: params[:kind]) if params[:kind].present?
          scope = scope.where(user_id: params[:user_id]) if params[:user_id].present?
          records, meta = paginate(scope)
          render json: { data: InvoiceSerializer.render_as_hash(records), pagination: meta }
        end

        def show
          render json: InvoiceSerializer.render_as_hash(find_invoice)
        end

        # Manual invoice (admin-issued). Amounts/line items provided by the admin.
        def create
          invoice = Invoice.new(invoice_params)
          invoice.kind = "manual" if invoice.kind.blank?
          invoice.issued_at ||= Time.current
          invoice.save!
          GenerateInvoiceJob.perform_later(invoice.id)
          render json: InvoiceSerializer.render_as_hash(invoice), status: :created
        end

        def update
          invoice = find_invoice
          invoice.update!(invoice_params)
          render json: InvoiceSerializer.render_as_hash(invoice)
        end

        def destroy
          find_invoice.destroy!
          head :no_content
        end

        def download
          invoice = find_invoice
          return head :not_found unless invoice.pdf.attached?

          send_data invoice.pdf.download,
                    filename: "#{invoice.invoice_number}.pdf",
                    type: "application/pdf",
                    disposition: "attachment"
        end

        # Re-render (if missing) and re-email the invoice to the customer.
        def resend
          GenerateInvoiceJob.perform_later(find_invoice.id)
          head :accepted
        end

        private

        def find_invoice = Invoice.find(params[:id])

        def invoice_params
          params.require(:invoice).permit(
            :user_id, :status, :kind, :subtotal, :tax, :total, :tax_rate,
            :currency, :payment_method, :notes,
            line_items: %i[description quantity unit_price amount]
          )
        end
      end
    end
  end
end
