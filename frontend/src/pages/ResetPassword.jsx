import { createFileRoute, Link } from "@tanstack/react-router";
import { AuthCard } from "@/components/hs/AuthCard";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Set New Password — Hour Stay" },
      { name: "description", content: "Set a new password for your Hour Stay account." },
      { property: "og:title", content: "Set New Password — Hour Stay" }
    ]
  }),
  component: () => (
    <AuthCard
      mode="reset"
      title="New Password"
      subtitle="Create a new password for your account."
      footer={
        <>
          Remembered your old password?{" "}
          <Link to="/login" className="font-medium text-purple hover:underline">Back to sign in</Link>
        </>
      }
    />
  )
});
