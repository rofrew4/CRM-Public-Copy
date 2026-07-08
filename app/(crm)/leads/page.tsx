import { Suspense } from "react";
import { LeadsPage } from "@/components/leads/LeadsPage";

export default function LeadsRoute() {
  return (
    <Suspense fallback={null}>
      <LeadsPage />
    </Suspense>
  );
}
