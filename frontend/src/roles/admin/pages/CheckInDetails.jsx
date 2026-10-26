import React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { GuestIdVerificationCheckIn } from "@/components/common/GuestIdVerificationCheckIn";

export const Route = createFileRoute("/admin/check-in/$id")({
  head: () => ({
    meta: [
      { title: "Guest Verification & Check-In — Speshway Luxury Hotel" },
      { name: "description", content: "Mandatory government ID proof capture and check-in clearance for online reservations." }
    ]
  }),
  component: AdminCheckInDetailsPage
});

function AdminCheckInDetailsPage() {
  return <GuestIdVerificationCheckIn role="admin" />;
}

export default AdminCheckInDetailsPage;
