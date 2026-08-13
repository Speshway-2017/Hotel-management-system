import { createFileRoute, Link } from "@tanstack/react-router";
import { AuthCard } from "@/components/hs/AuthCard";

export const Route = createFileRoute("/verify-otp")({
  head: () => ({
    meta: [
      { title: "Verify OTP — Hour Stay" },
      { name: "description", content: "Enter the verification code sent to your email or phone." },
      { property: "og:title", content: "Verify OTP — Hour Stay" }
    ]
  }),
  component: () => (
    <AuthCard
      mode="otp"
      title="Verify OTP"
      subtitle="Enter the 6-digit verification code sent to you."
      footer={
        <>
          Didn't receive code?{" "}
          <Link to="/login" className="font-medium text-purple hover:underline">Back to sign in</Link>
        </>
      }
    />
  )
});
