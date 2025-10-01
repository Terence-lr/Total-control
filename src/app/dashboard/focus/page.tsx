
'use client';

import { AppLayout } from "@/components/app-layout";
import { FocusClient } from "@/components/focus-client";
import { Suspense } from "react";

function FocusPageContent() {
    return (
        <AppLayout>
            <FocusClient />
        </AppLayout>
    )
}

export default function FocusPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <FocusPageContent />
    </Suspense>
  );
}
