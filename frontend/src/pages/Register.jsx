import { createFileRoute, Link } from "@tanstack/react-router";
import { AuthCard } from "@/components/hs/AuthCard";

export const Route = createFileRoute("/register")({
  head: () => ({
    meta: [
      { title: "Create an account — Hour Stay" },
      { name: "description", content: "Create your Hour Stay guest or property account in under a minute." },
      { property: "og:title", content: "Create an account — Hour Stay" },
      { property: "og:description", content: "Join Hour Stay in under a minute." }
    ]
  }),
  component: () => (
    <AuthCard
      mode="register"
      title="Create Account"
      subtitle="Book faster, unlock member rates and manage stays."
      footer={
        <>
          Already registered?{" "}
          <Link to="/login" className="font-medium text-purple hover:underline">Sign in</Link>
        </>
      }
    />
  )
});