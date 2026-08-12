import { createFileRoute } from "@tanstack/react-router";
import { DashShell } from "@/layouts/DashShell";

export const Route = createFileRoute("/manager")({
  component: () => <DashShell role="manager" />
});