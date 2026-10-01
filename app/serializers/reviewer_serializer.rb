# The person who wrote a review, as staff and admins see it: a name, never
# their contact details or address.
class ReviewerSerializer < Blueprinter::Base
  identifier :id
  fields :first_name, :last_name
end
