import React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { GuestIdVerificationCheckIn } from "@/components/common/GuestIdVerificationCheckIn";

export const Route = createFileRoute("/manager/check-in/$id")({
  head: () => ({
    meta: [
      { title: "Manager Guest ID Verification & Check-In — Hour Stay" },
      { name: "description", content: "Verify government ID proof and clear online bookings for check-in." }
    ]
  }),
  component: ManagerCheckInDetailsPage
});

function ManagerCheckInDetailsPage() {
  return <GuestIdVerificationCheckIn role="manager" />;
}

export default ManagerCheckInDetailsPage;
