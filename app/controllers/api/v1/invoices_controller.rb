module Api
  module V1
    # Customer-facing transactions: list invoices, view details, download the PDF.
    class InvoicesController < ApplicationController
      def index
        scope = current_user.invoices.recent
        scope = scope.where(kind: params[:kind]) if params[:kind].present?
        records, meta = paginate(scope)
        render json: { data: InvoiceSerializer.render_as_hash(records), pagination: meta }
      end

      def show
        render json: InvoiceSerializer.render_as_hash(current_user.invoices.find(params[:id]))
      end

      def download
        invoice = current_user.invoices.find(params[:id])
        return head :not_found unless invoice.pdf.attached?

        send_data invoice.pdf.download,
                  filename: "#{invoice.invoice_number}.pdf",
                  type: "application/pdf",
                  disposition: "attachment"
      end
    end
  end
end
