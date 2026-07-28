class CreateJobPostingsAndApplicationDocs < ActiveRecord::Migration[8.1]
  def change
    create_table :job_postings do |t|
      t.string  :title,           null: false
      t.string  :slug,            null: false
      t.string  :department
      t.string  :location
      t.string  :employment_type, null: false, default: "full_time"
      t.text    :description
      t.text    :requirements
      t.decimal :salary_min, precision: 10, scale: 2
      t.decimal :salary_max, precision: 10, scale: 2
      t.string  :status,          null: false, default: "draft"
      t.datetime :posted_at
      t.timestamps
    end
    add_index :job_postings, :slug, unique: true
    add_index :job_postings, :employment_type
    add_index :job_postings, :status

    change_table :job_applications, bulk: true do |t|
      t.references :job_posting, foreign_key: true
      # pending → clean → infected; documents are not downloadable until clean.
      t.string :scan_status, null: false, default: "pending"
    end
  end
end
