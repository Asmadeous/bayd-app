import type { Metadata } from "next"
import Link from "next/link"

import { LegalPage } from "@/components/legal/legal-page"

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "What personal information Beauty @ Your Door collects, why, who we share it with, and your choices.",
  alternates: { canonical: "/privacy" },
}

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy" updated="September 27, 2026" kind="privacy">
      <p>
        Beauty @ Your Door (&quot;BAYD&quot;, &quot;we&quot;) provides at-home beauty services in the Greater Toronto
        Area through our website, the BAYD app and the BAYD Staff app. This policy explains what personal information
        we collect, why, who we share it with, and the choices you have. Questions:{" "}
        <a href="mailto:Bookings@baydspa.ca">Bookings@baydspa.ca</a>.
      </p>

      <h2>What we collect</h2>
      <ul>
        <li><strong>Account and contact details:</strong> name, email address, phone number and, if you add one, a profile photo.</li>
        <li><strong>Service addresses:</strong> the addresses where you book appointments, including unit and buzzer details you give us.</li>
        <li><strong>Bookings:</strong> services, times, notes you add, reviews you leave, and messages you send to our team or your technician.</li>
        <li><strong>Payments:</strong> amounts, tips and gift card use. Card numbers are entered directly with our payment processors (Square and Helcim); we only keep a card reference, the card brand and the last 4 digits.</li>
        <li><strong>Location:</strong> the customer app can use your location, with your permission, to show how far away your technician is on the day of your appointment. The staff app shares a technician&apos;s location only while they are on shift, so clients can see their arrival time and so we can record shift mileage.</li>
        <li><strong>Device information:</strong> a push notification token so we can send booking updates, and error reports if the app crashes.</li>
        <li><strong>Video calls:</strong> if you join an optional video consultation, camera and microphone are used for that call only. We do not record calls.</li>
      </ul>

      <h2>How we use it</h2>
      <ul>
        <li>To book, schedule, deliver and support your appointments, and to match you with a technician who serves your area.</li>
        <li>To take payments, issue receipts and invoices, and handle refunds, tips and gift cards.</li>
        <li>To send you booking confirmations, reminders and updates by email, text message and push notification.</li>
        <li>To keep the service secure, prevent fraud and fix problems.</li>
        <li>To send marketing emails only if you opt in. You can opt out at any time.</li>
      </ul>

      <h2>Who we share it with</h2>
      <p>We don&apos;t sell your personal information. We share it only as needed to run the service:</p>
      <ul>
        <li><strong>Your technician</strong> sees your name, contact details, service address and booking notes for the appointments they are assigned.</li>
        <li><strong>Payment processors:</strong> Square and Helcim.</li>
        <li><strong>Service providers</strong> who process data for us: Google (maps, address lookup and optional Google sign-in), Firebase Cloud Messaging (push notifications), Infobip (text messages), our email provider, Sentry (error reports), Jitsi (video calls) and OpenStreetMap (map tiles).</li>
        <li><strong>Authorities</strong> when the law requires it.</li>
      </ul>
      <p>Some of these providers may process information outside Canada.</p>

      <h2>How long we keep it</h2>
      <p>
        We keep your account information while your account is open. Records of bookings, payments and invoices are
        kept after that because Canadian tax law requires businesses to keep transaction records.
      </p>

      <h2>Your choices and rights</h2>
      <ul>
        <li><strong>Access and correction:</strong> you can view and edit your details in the app or on the website, or ask us for a copy of your information.</li>
        <li><strong>Delete your account:</strong> in the app or on the website at any time. See <Link href="/delete-account">how to delete your account</Link>.</li>
        <li><strong>Location and notifications:</strong> you can turn these off in your device settings.</li>
        <li><strong>Marketing:</strong> you can unsubscribe from any marketing email.</li>
      </ul>
      <p>
        To make a request or a complaint, email <a href="mailto:Bookings@baydspa.ca">Bookings@baydspa.ca</a>. If you
        aren&apos;t satisfied with our response, you can contact the Office of the Privacy Commissioner of Canada.
      </p>

      <h2>Security</h2>
      <p>
        We use encrypted connections, keep card numbers with our payment processors rather than on our servers, and
        limit staff access to what each role needs.
      </p>

      <h2>Changes</h2>
      <p>If we change this policy, we will update the date at the top.</p>
    </LegalPage>
  )
}
