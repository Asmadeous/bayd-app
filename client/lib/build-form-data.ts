// Build a FormData body from a flat fields object plus one image File, for the
// admin forms that upload a photo (products/services/gallery/blog). Nested
// objects are appended with bracket notation (key[subkey]) so Rails parses them
// into a hash. Undefined/null/empty values are skipped. axios sets the
// multipart Content-Type automatically when given FormData.
export function buildFormData(
  fields: Record<string, unknown>,
  image: File,
  imageKey = "image",
): FormData {
  const fd = new FormData()
  for (const [key, value] of Object.entries(fields)) {
    if (value === null || value === undefined || value === "") continue
    if (typeof value === "object" && !(value instanceof Blob)) {
      for (const [sub, subVal] of Object.entries(value as Record<string, unknown>)) {
        if (subVal !== null && subVal !== undefined && subVal !== "") {
          fd.append(`${key}[${sub}]`, String(subVal))
        }
      }
    } else {
      fd.append(key, String(value))
    }
  }
  fd.append(imageKey, image)
  return fd
}
