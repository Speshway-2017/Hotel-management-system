import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteLayout } from "@/layouts/SiteLayout";
import { AuthCard } from "@/components/hs/AuthCard";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({
    meta: [
    { title: "Reset your password — Hour Stay" },
    { name: "description", content: "Reset the password for your Hour Stay account with a one-time link." },
    { property: "og:title", content: "Reset your password — Hour Stay" },
    { property: "og:description", content: "Recover access to your Hour Stay account." }]

  }),
  component: () => (
    <main className="min-h-screen w-full bg-cream flex flex-col justify-center items-center py-10 overflow-y-auto">
      <AuthCard
        mode="forgot"
        title="Reset Password"
        subtitle="We'll send a one-time link to your registered email."
        footer={
          <>
            Remembered it?{" "}
            <Link to="/login" className="font-medium text-purple hover:underline">Back to sign in</Link>
          </>
        }
      />
    </main>
  )

});