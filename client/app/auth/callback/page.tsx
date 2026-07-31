import { Suspense } from "react";

import { GoogleCallback } from "./google-callback";

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={null}>
      <GoogleCallback />
    </Suspense>
  );
}
