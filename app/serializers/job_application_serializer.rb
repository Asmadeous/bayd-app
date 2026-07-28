class JobApplicationSerializer < Blueprinter::Base
  identifier :id
  fields :name, :email, :phone, :role_applied_for, :message,
         :status, :scan_status, :created_at

  field :job_title do |app|
    app.job_posting&.title || app.role_applied_for
  end

  # Document metadata only — never the file itself, and never a public blob URL.
  # The download path hits an admin-authenticated, scan-gated endpoint.
  field :documents do |app|
    next [] unless app.documents.attached?

    app.documents.map do |doc|
      {
        id: doc.id,
        filename: doc.filename.to_s,
        byte_size: doc.blob.byte_size,
        downloadable: app.documents_downloadable?,
        download_path: "/api/v1/admin/job_applications/#{app.id}/documents/#{doc.id}"
      }
    end
  end
end
