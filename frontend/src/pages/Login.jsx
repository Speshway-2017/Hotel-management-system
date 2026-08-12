import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteLayout } from "@/layouts/SiteLayout";
import { AuthCard, RoleShortcuts } from "@/components/hs/AuthCard";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
    { title: "Sign in — Hour Stay" },
    { name: "description", content: "Sign in to your Hour Stay workspace as owner, manager, front desk or guest." },
    { property: "og:title", content: "Sign in — Hour Stay" },
    { property: "og:description", content: "Access your Hour Stay hotel workspace." }]

  }),
  component: () => (
    <main className="min-h-screen w-full bg-cream flex flex-col justify-center items-center py-10 overflow-y-auto">
      <AuthCard
        mode="login"
        title="Sign In"
        subtitle="Sign in to your property workspace."
        footer={
          <>
            New to Hour Stay?{" "}
            <Link to="/register" className="font-medium text-purple hover:underline">Create an account</Link>
          </>
        }
      />
    </main>
  )

});