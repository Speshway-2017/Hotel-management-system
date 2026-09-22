import { useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { DashShell } from "@/layouts/DashShell";
import { receptionCache } from "@/services/receptionCache";

function ReceptionShellWrapper() {
  useEffect(() => {
    // Warm up and prefetch all receptionist tab datasets in the background
    receptionCache.prefetchAll();
  }, []);

  return <DashShell role="reception" />;
}

export const Route = createFileRoute("/reception")({
  component: ReceptionShellWrapper
});