import { redirect } from "next/navigation"

// Entry point: the app opens here and lands on the Home tab. The (app) layout's
// auth gate handles sending an unauthenticated user to /app/welcome instead.
export default function AppIndex() {
  redirect("/app/home")
}
