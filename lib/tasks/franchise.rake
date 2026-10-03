namespace :franchise do
  desc "Make an existing staff or admin account a super admin: bin/rails 'franchise:promote_super_admin[email]'"
  task :promote_super_admin, [ :email ] => :environment do |_t, args|
    user = User.find_by(email: args[:email].to_s.downcase.strip)
    abort "No account with that email." unless user
    abort "Super admins sign in with a password; #{user.email} is a customer account." if user.customer?

    user.update_columns(role: "super_admin", updated_at: Time.current)
    puts "#{user.email} is now a super admin."
  end
end
