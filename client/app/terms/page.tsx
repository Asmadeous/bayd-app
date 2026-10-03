import type { Metadata } from "next"
import Link from "next/link"

import { LegalPage } from "@/components/legal/legal-page"

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "The terms for booking and using Beauty @ Your Door at-home beauty services.",
  alternates: { canonical: "/terms" },
}

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Service" updated="September 29, 2026" kind="terms">
      <p>
        These terms apply when you book or use Beauty @ Your Door (&quot;BAYD&quot;, &quot;we&quot;) services through
        our website or the BAYD app. By booking, you agree to them. Questions:{" "}
        <a href="mailto:Bookings@baydspa.ca">Bookings@baydspa.ca</a>.
      </p>

      <h2>Bookings</h2>
      <ul>
        <li>Our technicians come to the address you give us. Please make sure the technician can get in (unit, buzzer and parking details help).</li>
        <li>Appointment times are in Eastern time. Prices are shown before you book and include any add-ons you choose.</li>
      </ul>

      <h2>Changes and cancellations</h2>
      <ul>
        <li>You can reschedule a booking up to 24 hours before it starts, up to 2 times, in the app or on the website.</li>
        <li>You can cancel a booking up to 24 hours before it starts. For later changes, contact us.</li>
        <li>If your technician can&apos;t make it, we&apos;ll tell you and offer a new time. You won&apos;t be charged.</li>
      </ul>

      <h2>No-shows</h2>
      <p>
        If your technician arrives and can&apos;t reach you or can&apos;t get in after the appointment starts, the
        booking is marked a no-show and the unpaid balance of the booking is charged to your card on file.
      </p>

      <h2>Payments</h2>
      <ul>
        <li>Payments are processed by Square or Helcim. Depending on the booking you may pay in advance, pay a deposit (group bookings), or pay after the service.</li>
        <li>If you save a card, you authorize us to charge it for bookings you make, balances after service, and no-shows as described above.</li>
        <li>Tips are optional and go to your technician.</li>
        <li>Gift cards can be used toward services.</li>
      </ul>

      <h2>Messages, photos and reviews</h2>
      <p>
        You can message your technician and our team, share photos, and review your services. We have zero tolerance
        for objectionable content and abusive users.
      </p>
      <ul>
        <li>Don&apos;t post anything abusive, harassing, hateful, sexual, threatening, unlawful or spam, and don&apos;t ask a technician for services we don&apos;t offer.</li>
        <li>Offensive language is filtered out of messages, and every review is checked by our team before it&apos;s published.</li>
        <li>In the BAYD app, open a chat and tap its menu to report or block the other person. We review every report within 24 hours.</li>
        <li>We remove content that breaks these rules and close the accounts of people who post it.</li>
      </ul>

      <h2>Your account</h2>
      <p>
        Keep your contact details up to date so we can reach you about your bookings. You can delete your account at any
        time; see <Link href="/delete-account">how to delete your account</Link>. Our{" "}
        <Link href="/privacy">Privacy Policy</Link> explains how we handle your information.
      </p>

      <h2>Changes to these terms</h2>
      <p>If we change these terms, we will update the date at the top.</p>
    </LegalPage>
  )
}
