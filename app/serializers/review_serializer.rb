class ReviewSerializer < Blueprinter::Base
  identifier :id
  fields :rating, :body, :approved, :featured, :created_at

  association :user,             blueprint: UserSerializer
  association :employee_profile, blueprint: EmployeeProfileSerializer
end
