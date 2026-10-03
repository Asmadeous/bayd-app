module Api
  module V1
    module Super
      # A franchise's admins: invite one (an account and a set-your-password
      # email) or take admin access away.
      class FranchiseAdminsController < BaseController
        def create
          result = FranchiseAdminInvite.call(franchise, **params.permit(:email, :first_name, :last_name, :phone).to_h.symbolize_keys)
          return render json: { error: result.error }, status: :unprocessable_entity unless result.success?

          render json: FranchiseSerializer.render_as_hash(franchise.reload), status: :created
        end

        # Removing an admin ends their access at once (roles are read per request).
        def destroy
          admin = franchise.users.where(role: "admin").find(params[:id])
          admin.update_columns(role: "customer", franchise_id: nil, updated_at: Time.current)
          render json: FranchiseSerializer.render_as_hash(franchise.reload)
        end
      end
    end
  end
end
