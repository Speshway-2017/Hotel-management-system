import { createFileRoute } from "@tanstack/react-router";
import { DashShell } from "@/layouts/DashShell";

export const Route = createFileRoute("/admin")({
  component: () => <DashShell role="admin" />
});