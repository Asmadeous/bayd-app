class ApplicationJob < ActiveJob::Base
  # A job runs in the franchise it was enqueued from (its times, currency and
  # records), the way the request that queued it did.
  attr_accessor :franchise_id

  def serialize
    super.merge("franchise_id" => franchise_id || Current.franchise&.id)
  end

  def deserialize(job_data)
    super
    self.franchise_id = job_data["franchise_id"]
  end

  around_perform do |job, block|
    franchise = job.franchise_id && Franchise.find_by(id: job.franchise_id)
    Current.set(franchise: franchise) { block.call }
  end
  # Automatically retry jobs that encountered a deadlock
  # retry_on ActiveRecord::Deadlocked

  # Most jobs are safe to ignore if the underlying records are no longer available
  # discard_on ActiveJob::DeserializationError
end
