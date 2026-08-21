require "rails_helper"

# Guards the fix for the no_double_booking 500: when a booking's slot is taken
# between the availability check and the write, the exclusion constraint trips.
# That must resolve to a clean :slot_taken failure Result — never a 500.
RSpec.describe AssignmentService, "#assign slot-taken handling" do
  let(:booking_request) { create(:booking_request) }
  let(:service)         { described_class.new(booking_request) }

  # Build a fake PG::ExclusionViolation wrapped in StatementInvalid, exactly as
  # ActiveRecord surfaces a no_double_booking conflict. `raise ... cause:` sets
  # the #cause the production code inspects (e.cause.is_a?(PG::ExclusionViolation)).
  def exclusion_violation
    cause = PG::ExclusionViolation.new(
      'conflicting key value violates exclusion constraint "no_double_booking"'
    )
    raise ActiveRecord::StatementInvalid, "PG::ExclusionViolation", cause: cause
  rescue ActiveRecord::StatementInvalid => e
    e
  end

  def non_exclusion_statement_invalid
    raise ActiveRecord::StatementInvalid, "boom", cause: PG::UndefinedTable.new("nope")
  rescue ActiveRecord::StatementInvalid => e
    e
  end

  describe "#assign" do
    let(:candidate) { { employee: build_stubbed(:employee_profile), distance_km: 1.0, source: "test" } }

    it "returns :slot_taken when every candidate's slot is already booked" do
      allow(service).to receive(:create_booking_for).and_raise(exclusion_violation)

      expect(service.send(:assign, [ candidate, candidate ])).to eq(:slot_taken)
    end

    it "returns nil when there are no candidates to try (not a conflict)" do
      expect(service.send(:assign, [])).to be_nil
    end

    it "re-raises a StatementInvalid that is NOT an exclusion violation" do
      allow(service).to receive(:create_booking_for).and_raise(non_exclusion_statement_invalid)

      expect { service.send(:assign, [ candidate ]) }.to raise_error(ActiveRecord::StatementInvalid)
    end
  end

  describe "#failure" do
    it "returns a clean failure Result even if the status write hits an aborted transaction" do
      allow(booking_request).to receive(:update!).and_raise(exclusion_violation)
      allow(service).to receive(:log_attempt) # avoid a second DB write in the unit test

      result = service.send(:failure, :no_availability, :slot_taken, "all_candidates_taken")

      expect(result.success).to be(false)
      expect(result.error).to eq(:slot_taken)
    end
  end
end
