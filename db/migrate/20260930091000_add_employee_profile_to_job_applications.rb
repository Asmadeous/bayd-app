class AddEmployeeProfileToJobApplications < ActiveRecord::Migration[8.1]
  def change
    add_reference :job_applications, :employee_profile, foreign_key: { on_delete: :nullify }
  end
end
