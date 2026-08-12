import React from "react";
import { BrowserRouter, Routes, Route, useParams } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/sonner";
import { LoaderDataContext } from "@/utils/tanstack-router-mock";

// Import Public Pages
import { Route as Home } from "./pages/Home";
import { Route as About } from "./pages/About";
import { Route as Features } from "./pages/Features";
import { Route as Contact } from "./pages/Contact";
import { Route as Search } from "./pages/Search";
import { Route as RoomDetails } from "./pages/RoomDetails";
import { Route as BlogIndex } from "./pages/BlogIndex";
import { Route as BlogPost } from "./pages/BlogPost";
import { Route as Login } from "./pages/Login";
import { Route as Register } from "./pages/Register";
import { Route as ForgotPassword } from "./pages/ForgotPassword";
import { Route as BookingIndex } from "./pages/BookingIndex";
import { Route as BookingConfirmation } from "./pages/BookingConfirmation";

// Import Admin Workspace Pages
import { Route as AdminLayout } from "./roles/admin/pages/AdminLayout";
import { Route as AdminDashboard } from "./roles/admin/pages/Dashboard";
import { Route as AdminApprovals } from "./roles/admin/pages/Approvals";
import { Route as AdminBilling } from "./roles/admin/pages/Billing";
import { Route as AdminChannels } from "./roles/admin/pages/Channels";
import { Route as AdminFrontDesk } from "./roles/admin/pages/FrontDesk";
import { Route as AdminGuests } from "./roles/admin/pages/Guests";
import { Route as AdminNotifications } from "./roles/admin/pages/Notifications";
import { Route as AdminPayments } from "./roles/admin/pages/Payments";
import { Route as AdminRates } from "./roles/admin/pages/Rates";
import { Route as AdminReports } from "./roles/admin/pages/Reports";
import { Route as AdminReservations } from "./roles/admin/pages/Reservations";
import { Route as AdminRooms } from "./roles/admin/pages/Rooms";
import { Route as AdminSettings } from "./roles/admin/pages/Settings";
import { Route as AdminStaff } from "./roles/admin/pages/Staff";
import { Route as AdminTaxes } from "./roles/admin/pages/Taxes";

// Import Manager Workspace Pages
import { Route as ManagerLayout } from "./roles/manager/pages/ManagerLayout";
import { Route as ManagerDashboard } from "./roles/manager/pages/Dashboard";
import { Route as ManagerApprovals } from "./roles/manager/pages/Approvals";
import { Route as ManagerArrivals } from "./roles/manager/pages/Arrivals";
import { Route as ManagerFeedback } from "./roles/manager/pages/Feedback";
import { Route as ManagerGuests } from "./roles/manager/pages/Guests";
import { Route as ManagerNotifications } from "./roles/manager/pages/Notifications";
import { Route as ManagerOccupancy } from "./roles/manager/pages/Occupancy";
import { Route as ManagerReports } from "./roles/manager/pages/Reports";
import { Route as ManagerReservations } from "./roles/manager/pages/Reservations";
import { Route as ManagerShifts } from "./roles/manager/pages/Shifts";

// Import Receptionist Workspace Pages
import { Route as ReceptionLayout } from "./roles/receptionist/pages/ReceptionLayout";
import { Route as ReceptionDashboard } from "./roles/receptionist/pages/Dashboard";
import { Route as ReceptionCheckIn } from "./roles/receptionist/pages/CheckIn";
import { Route as ReceptionCheckOut } from "./roles/receptionist/pages/CheckOut";
import { Route as ReceptionFolio } from "./roles/receptionist/pages/Folio";
import { Route as ReceptionGuestSearch } from "./roles/receptionist/pages/GuestSearch";
import { Route as ReceptionIdCapture } from "./roles/receptionist/pages/IdCapture";
import { Route as ReceptionMaintenance } from "./roles/receptionist/pages/Maintenance";
import { Route as ReceptionNewBooking } from "./roles/receptionist/pages/NewBooking";
import { Route as ReceptionNotifications } from "./roles/receptionist/pages/Notifications";
import { Route as ReceptionPayments } from "./roles/receptionist/pages/Payments";
import { Route as ReceptionReservations } from "./roles/receptionist/pages/Reservations";
import { Route as ReceptionRoomAssignment } from "./roles/receptionist/pages/RoomAssignment";

// Import Guest Workspace Pages
import { Route as GuestLayout } from "./roles/guest/pages/GuestLayout";
import { Route as GuestDashboard } from "./roles/guest/pages/Dashboard";
import { Route as GuestBooking } from "./roles/guest/pages/Booking";
import { Route as GuestBookings } from "./roles/guest/pages/Bookings";
import { Route as GuestFolio } from "./roles/guest/pages/Folio";
import { Route as GuestLoyalty } from "./roles/guest/pages/Loyalty";
import { Route as GuestNotifications } from "./roles/guest/pages/Notifications";
import { Route as GuestPayment } from "./roles/guest/pages/Payment";
import { Route as GuestPreCheckIn } from "./roles/guest/pages/PreCheckIn";
import { Route as GuestProfile } from "./roles/guest/pages/Profile";
import { Route as GuestReviews } from "./roles/guest/pages/Reviews";
import { Route as GuestSearch } from "./roles/guest/pages/Search";
import { Route as GuestServices } from "./roles/guest/pages/Services";

// Import Super Admin Workspace Pages
import { Route as SuperAdminLayout } from "./roles/super-admin/pages/SuperAdminLayout";
import { Route as SuperAdminDashboard } from "./roles/super-admin/pages/Dashboard";
import { Route as SuperAdminAdmins } from "./roles/super-admin/pages/Admins";
import { Route as SuperAdminAuditLogs } from "./roles/super-admin/pages/AuditLogs";
import { Route as SuperAdminChannelManager } from "./roles/super-admin/pages/ChannelManager";
import { Route as SuperAdminNotifications } from "./roles/super-admin/pages/Notifications";
import { Route as SuperAdminOccupancy } from "./roles/super-admin/pages/Occupancy";
import { Route as SuperAdminProperties } from "./roles/super-admin/pages/Properties";
import { Route as SuperAdminReports } from "./roles/super-admin/pages/Reports";
import { Route as SuperAdminReservations } from "./roles/super-admin/pages/Reservations";
import { Route as SuperAdminUsers } from "./roles/super-admin/pages/Users";

const queryClient = new QueryClient();

// Route wrapper to handle loader data loading and lifecycle hooks
function RouteWrapper({ routeObj }) {
  const params = useParams();
  let loaderData = {};

  if (routeObj._config && routeObj._config.loader) {
    try {
      loaderData = routeObj._config.loader({ params }) || {};
    } catch (e) {
      if (routeObj._config.notFoundComponent) {
        const NotFoundComp = routeObj._config.notFoundComponent;
        return <NotFoundComp />;
      }
      throw e;
    }
  }

  const Component = routeObj.component;
  return (
    <LoaderDataContext.Provider value={loaderData}>
      <Component />
    </LoaderDataContext.Provider>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* Public Stays Routes */}
          <Route path="/" element={<RouteWrapper routeObj={Home} />} />
          <Route path="/about" element={<RouteWrapper routeObj={About} />} />
          <Route path="/features" element={<RouteWrapper routeObj={Features} />} />
          <Route path="/contact" element={<RouteWrapper routeObj={Contact} />} />
          <Route path="/search" element={<RouteWrapper routeObj={Search} />} />
          <Route path="/rooms/:roomId" element={<RouteWrapper routeObj={RoomDetails} />} />
          <Route path="/blog" element={<RouteWrapper routeObj={BlogIndex} />} />
          <Route path="/blog/:slug" element={<RouteWrapper routeObj={BlogPost} />} />
          <Route path="/login" element={<RouteWrapper routeObj={Login} />} />
          <Route path="/register" element={<RouteWrapper routeObj={Register} />} />
          <Route path="/forgot-password" element={<RouteWrapper routeObj={ForgotPassword} />} />
          <Route path="/booking" element={<RouteWrapper routeObj={BookingIndex} />} />
          <Route path="/booking/confirmation" element={<RouteWrapper routeObj={BookingConfirmation} />} />

          {/* Admin Workspace */}
          <Route element={<RouteWrapper routeObj={AdminLayout} />}>
            <Route path="/admin" element={<RouteWrapper routeObj={AdminDashboard} />} />
            <Route path="/admin/approvals" element={<RouteWrapper routeObj={AdminApprovals} />} />
            <Route path="/admin/billing" element={<RouteWrapper routeObj={AdminBilling} />} />
            <Route path="/admin/channels" element={<RouteWrapper routeObj={AdminChannels} />} />
            <Route path="/admin/front-desk" element={<RouteWrapper routeObj={AdminFrontDesk} />} />
            <Route path="/admin/guests" element={<RouteWrapper routeObj={AdminGuests} />} />
            <Route path="/admin/notifications" element={<RouteWrapper routeObj={AdminNotifications} />} />
            <Route path="/admin/payments" element={<RouteWrapper routeObj={AdminPayments} />} />
            <Route path="/admin/rates" element={<RouteWrapper routeObj={AdminRates} />} />
            <Route path="/admin/reports" element={<RouteWrapper routeObj={AdminReports} />} />
            <Route path="/admin/reservations" element={<RouteWrapper routeObj={AdminReservations} />} />
            <Route path="/admin/rooms" element={<RouteWrapper routeObj={AdminRooms} />} />
            <Route path="/admin/settings" element={<RouteWrapper routeObj={AdminSettings} />} />
            <Route path="/admin/staff" element={<RouteWrapper routeObj={AdminStaff} />} />
            <Route path="/admin/taxes" element={<RouteWrapper routeObj={AdminTaxes} />} />
          </Route>

          {/* Manager Workspace */}
          <Route element={<RouteWrapper routeObj={ManagerLayout} />}>
            <Route path="/manager" element={<RouteWrapper routeObj={ManagerDashboard} />} />
            <Route path="/manager/approvals" element={<RouteWrapper routeObj={ManagerApprovals} />} />
            <Route path="/manager/arrivals" element={<RouteWrapper routeObj={ManagerArrivals} />} />
            <Route path="/manager/feedback" element={<RouteWrapper routeObj={ManagerFeedback} />} />
            <Route path="/manager/guests" element={<RouteWrapper routeObj={ManagerGuests} />} />
            <Route path="/manager/notifications" element={<RouteWrapper routeObj={ManagerNotifications} />} />
            <Route path="/manager/occupancy" element={<RouteWrapper routeObj={ManagerOccupancy} />} />
            <Route path="/manager/reports" element={<RouteWrapper routeObj={ManagerReports} />} />
            <Route path="/manager/reservations" element={<RouteWrapper routeObj={ManagerReservations} />} />
            <Route path="/manager/shifts" element={<RouteWrapper routeObj={ManagerShifts} />} />
          </Route>

          {/* Receptionist Workspace */}
          <Route element={<RouteWrapper routeObj={ReceptionLayout} />}>
            <Route path="/reception" element={<RouteWrapper routeObj={ReceptionDashboard} />} />
            <Route path="/reception/check-in" element={<RouteWrapper routeObj={ReceptionCheckIn} />} />
            <Route path="/reception/check-out" element={<RouteWrapper routeObj={ReceptionCheckOut} />} />
            <Route path="/reception/folio" element={<RouteWrapper routeObj={ReceptionFolio} />} />
            <Route path="/reception/guest-search" element={<RouteWrapper routeObj={ReceptionGuestSearch} />} />
            <Route path="/reception/id-capture" element={<RouteWrapper routeObj={ReceptionIdCapture} />} />
            <Route path="/reception/maintenance" element={<RouteWrapper routeObj={ReceptionMaintenance} />} />
            <Route path="/reception/new-booking" element={<RouteWrapper routeObj={ReceptionNewBooking} />} />
            <Route path="/reception/notifications" element={<RouteWrapper routeObj={ReceptionNotifications} />} />
            <Route path="/reception/payments" element={<RouteWrapper routeObj={ReceptionPayments} />} />
            <Route path="/reception/reservations" element={<RouteWrapper routeObj={ReceptionReservations} />} />
            <Route path="/reception/room-assignment" element={<RouteWrapper routeObj={ReceptionRoomAssignment} />} />
          </Route>

          {/* Guest Workspace */}
          <Route element={<RouteWrapper routeObj={GuestLayout} />}>
            <Route path="/guest" element={<RouteWrapper routeObj={GuestDashboard} />} />
            <Route path="/guest/booking" element={<RouteWrapper routeObj={GuestBooking} />} />
            <Route path="/guest/bookings" element={<RouteWrapper routeObj={GuestBookings} />} />
            <Route path="/guest/folio" element={<RouteWrapper routeObj={GuestFolio} />} />
            <Route path="/guest/loyalty" element={<RouteWrapper routeObj={GuestLoyalty} />} />
            <Route path="/guest/notifications" element={<RouteWrapper routeObj={GuestNotifications} />} />
            <Route path="/guest/payment" element={<RouteWrapper routeObj={GuestPayment} />} />
            <Route path="/guest/pre-check-in" element={<RouteWrapper routeObj={GuestPreCheckIn} />} />
            <Route path="/guest/profile" element={<RouteWrapper routeObj={GuestProfile} />} />
            <Route path="/guest/reviews" element={<RouteWrapper routeObj={GuestReviews} />} />
            <Route path="/guest/search" element={<RouteWrapper routeObj={GuestSearch} />} />
            <Route path="/guest/services" element={<RouteWrapper routeObj={GuestServices} />} />
          </Route>

          {/* Super Admin Workspace */}
          <Route element={<RouteWrapper routeObj={SuperAdminLayout} />}>
            <Route path="/super-admin" element={<RouteWrapper routeObj={SuperAdminDashboard} />} />
            <Route path="/super-admin/admins" element={<RouteWrapper routeObj={SuperAdminAdmins} />} />
            <Route path="/super-admin/audit-logs" element={<RouteWrapper routeObj={SuperAdminAuditLogs} />} />
            <Route path="/super-admin/channel-manager" element={<RouteWrapper routeObj={SuperAdminChannelManager} />} />
            <Route path="/super-admin/notifications" element={<RouteWrapper routeObj={SuperAdminNotifications} />} />
            <Route path="/super-admin/occupancy" element={<RouteWrapper routeObj={SuperAdminOccupancy} />} />
            <Route path="/super-admin/properties" element={<RouteWrapper routeObj={SuperAdminProperties} />} />
            <Route path="/super-admin/reports" element={<RouteWrapper routeObj={SuperAdminReports} />} />
            <Route path="/super-admin/reservations" element={<RouteWrapper routeObj={SuperAdminReservations} />} />
            <Route path="/super-admin/users" element={<RouteWrapper routeObj={SuperAdminUsers} />} />
          </Route>
        </Routes>
        <Toaster />
      </BrowserRouter>
    </QueryClientProvider>
  );
}
