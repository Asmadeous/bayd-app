# Canonicalises Canadian postal codes. Service coverage matches on the FSA —
# the Forward Sortation Area, i.e. the first 3 characters (e.g. "m5v 2t6" → the
# FSA "M5V"). A provider lists the FSAs they serve; a customer's full code is
# trimmed to its FSA for matching.
module PostalCode
  # A1A1A1 with the letters Canada Post actually uses (no D,F,I,O,Q,U; no W,Z in
  # the first position).
  FORMAT     = /\A[ABCEGHJ-NPRSTVXY]\d[ABCEGHJ-NPRSTV-Z]\d[ABCEGHJ-NPRSTV-Z]\d\z/
  FSA_FORMAT = /\A[ABCEGHJ-NPRSTVXY]\d[ABCEGHJ-NPRSTV-Z]\z/

  module_function

  # → "M5V2T6" or nil.
  def normalize(raw)
    compact = raw.to_s.upcase.gsub(/[^A-Z0-9]/, "")
    compact if compact.match?(FORMAT)
  end

  # Forward Sortation Area (first 3 chars). Accepts a full code or a bare FSA.
  # → "M5V" or nil.
  def fsa(raw)
    candidate = raw.to_s.upcase.gsub(/[^A-Z0-9]/, "")[0, 3]
    candidate if candidate&.match?(FSA_FORMAT)
  end

  def valid?(raw)
    normalize(raw).present?
  end

  # Normalize a list to FSAs, dropping blanks/invalids and de-duping. Entries may
  # be separated by commas, whitespace, or newlines.
  def normalize_fsa_list(list)
    Array(list).flat_map { |v| v.to_s.split(/[,\s]+/) }
               .filter_map { |v| fsa(v) }
               .uniq
  end

  # Legacy full-code list normalizer, still used by the (superseded) ServiceArea
  # zones. Coverage now matches on FSAs via provider lists.
  def normalize_list(list)
    Array(list).flat_map { |v| v.to_s.split(/[,\n]+/) }
               .filter_map { |v| normalize(v) }
               .uniq
  end
end
