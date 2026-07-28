class JobPostingSerializer < Blueprinter::Base
  identifier :id
  fields :title, :slug, :department, :location, :employment_type,
         :description, :requirements, :salary_min, :salary_max, :posted_at

  # Admin-only view adds status + how many have applied.
  view :admin do
    field :status
    field :applications_count do |posting|
      posting.job_applications.size
    end
    field :created_at
  end
end
