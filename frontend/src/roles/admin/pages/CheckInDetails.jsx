import React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { GuestIdVerificationCheckIn } from "@/components/common/GuestIdVerificationCheckIn";

export const Route = createFileRoute("/admin/check-in/$id")({
  head: () => ({
    meta: [
      { title: "Admin Guest ID Verification & Check-In — Hour Stay" },
      { name: "description", content: "Verify government ID proof and clear online bookings for check-in." }
    ]
  }),
  component: AdminCheckInDetailsPage
});

function AdminCheckInDetailsPage() {
  return <GuestIdVerificationCheckIn role="admin" />;
}

export default AdminCheckInDetailsPage;
