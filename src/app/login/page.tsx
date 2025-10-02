
import { AuthClient } from "@/components/auth-client";
import { Suspense } from "react";

function LoginPageContent() {
    return <AuthClient />;
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginPageContent />
    </Suspense>
  );
}
