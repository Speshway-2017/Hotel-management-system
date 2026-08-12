import { createFileRoute } from "@tanstack/react-router";
import { DashShell } from "@/layouts/DashShell";

export const Route = createFileRoute("/super-admin")({
  component: () => <DashShell role="super-admin" />
});