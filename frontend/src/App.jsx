import React from "react";
import { BrowserRouter, Routes, Route, useParams, useLocation, Outlet, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/sonner";
import { LoaderDataContext } from "@/utils/tanstack-router-mock";
import { AuthLayout } from "./layouts/AuthLayout";
import { authService } from "./services/auth";

// Import Public Pages
import { Route as Home } from "./pages/Home";
import { Route as About } from "./pages/About";
import { Route as Features } from "./pages/Features";
import { Route as Contact } from "./pages/Contact";
import { Route as Search } from "./pages/Search";
import { Route as RoomDetails } from "./pages/RoomDetails";
import { Route as HotelDetails } from "./pages/HotelDetails";
import { Route as BlogIndex } from "./pages/BlogIndex";
import { Route as BlogPost } from "./pages/BlogPost";
import { Route as Login } from "./pages/Login";
import { Route as Register } from "./pages/Register";
import { Route as ForgotPassword } from "./pages/ForgotPassword";
import { Route as ResetPassword } from "./pages/ResetPassword";
import { Route as VerifyOtp } from "./pages/VerifyOtp";
import { Route as BookingIndex } from "./pages/BookingIndex";
import { Route as BookingConfirmation } from "./pages/BookingConfirmation";

// Import Admin Workspace Pages
import { Route as AdminLayout } from "./roles/admin/pages/AdminLayout";
import { Route as AdminDashboard } from "./roles/admin/pages/Dashboard";
import { Route as AdminApprovals } from "./roles/admin/pages/Approvals";
import { Route as AdminViewApproval } from "./roles/admin/pages/ViewApproval";
import { Route as AdminBilling } from "./roles/admin/pages/Billing";
import { Route as AdminChannels } from "./roles/admin/pages/Channels";
import { Route as AdminGuests } from "./roles/admin/pages/Guests";
import { Route as AdminAddGuest } from "./roles/admin/pages/AddGuest";
import { Route as AdminEditGuest } from "./roles/admin/pages/EditGuest";
import { Route as AdminViewGuest } from "./roles/admin/pages/ViewGuest";
import { Route as AdminNotifications } from "./roles/admin/pages/Notifications";
import { Route as AdminNotificationDetails } from "./roles/admin/pages/NotificationDetails";
import { Route as AdminPayments } from "./roles/admin/pages/Payments";
import { Route as AdminPaymentDetails } from "./roles/admin/pages/PaymentDetails";
import { Route as AdminReports } from "./roles/admin/pages/Reports";
import { Route as AdminReservations } from "./roles/admin/pages/Reservations";
import { Route as AdminRooms } from "./roles/admin/pages/Rooms";
import { Route as AdminAddRoom } from "./roles/admin/pages/AddRoom";
import { Route as AdminAddRoomType } from "./roles/admin/pages/AddRoomType";
import { Route as AdminViewRoom } from "./roles/admin/pages/ViewRoom";
import { Route as AdminEditRoom } from "./roles/admin/pages/EditRoom";
import { Route as AdminEditRoomType } from "./roles/admin/pages/EditRoomType";
import { Route as AdminSettings } from "./roles/admin/pages/Settings";
import { Route as AdminStaff } from "./roles/admin/pages/Staff";
import { Route as AdminAddStaff } from "./roles/admin/pages/AddStaff";
import { Route as AdminEditStaff } from "./roles/admin/pages/EditStaff";
import { Route as AdminViewStaff } from "./roles/admin/pages/ViewStaff";
import { Route as AdminTaxes } from "./roles/admin/pages/Taxes";
import { Route as AdminFeedback } from "./roles/admin/pages/Feedback";
import { Route as AdminViewFeedback } from "./roles/admin/pages/ViewFeedback";
import { Route as AdminCrm } from "./roles/admin/pages/Crm";
import { Route as AdminSubscription } from "./roles/admin/pages/Subscription";
import { Route as AdminCoupons } from "./roles/admin/pages/Coupons";
import { Route as AdminAddCoupon } from "./roles/admin/pages/AddCoupon";
import { Route as AdminEditCoupon } from "./roles/admin/pages/EditCoupon";
import { Route as AdminViewCoupon } from "./roles/admin/pages/ViewCoupon";
import { Route as AdminProfile } from "./roles/admin/pages/Profile";
import { Route as AdminAddReservation } from "./roles/admin/pages/AddReservation";
import { Route as AdminEditReservation } from "./roles/admin/pages/EditReservation";
import { Route as AdminViewReservation } from "./roles/admin/pages/ViewReservation";
import { Route as AdminExtendReservation } from "./roles/admin/pages/ExtendReservation";
import { Route as AdminCheckInDetails } from "./roles/admin/pages/CheckInDetails";

// Import Manager Workspace Pages
import { Route as ManagerLayout } from "./roles/manager/pages/ManagerLayout";
import { Route as ManagerDashboard } from "./roles/manager/pages/Dashboard";
import { Route as ManagerApprovals } from "./roles/manager/pages/Approvals";
import { Route as ManagerArrivals } from "./roles/manager/pages/Arrivals";
import { Route as ManagerCheckInDetails } from "./roles/manager/pages/CheckInDetails";
import { Route as ManagerFeedback } from "./roles/manager/pages/Feedback";
import { Route as ManagerViewFeedback } from "./roles/manager/pages/ViewFeedback";
import { Route as ManagerBilling } from "./roles/manager/pages/Billing";
import { Route as ManagerViewBilling } from "./roles/manager/pages/ViewBilling";
import { Route as ManagerPayments } from "./roles/manager/pages/Payments";
import { Route as ManagerPaymentDetails } from "./roles/manager/pages/PaymentDetails";
import { Route as ManagerGuests } from "./roles/manager/pages/Guests";
import { Route as ManagerNotifications } from "./roles/manager/pages/Notifications";
import { Route as ManagerNotificationDetails } from "./roles/manager/pages/NotificationDetails";
import { Route as ManagerOccupancy } from "./roles/manager/pages/Occupancy";
import { Route as ManagerReports } from "./roles/manager/pages/Reports";
import { Route as ManagerViewReport } from "./roles/manager/pages/ViewReport";
import { Route as ManagerReservations } from "./roles/manager/pages/Reservations";
import { Route as ManagerAddReservation } from "./roles/manager/pages/AddReservation";
import { Route as ManagerViewReservation } from "./roles/manager/pages/ViewReservation";
import { Route as ManagerEditReservation } from "./roles/manager/pages/EditReservation";
import { Route as ManagerExtendReservation } from "./roles/manager/pages/ExtendReservation";
import { Route as ManagerShifts } from "./roles/manager/pages/Shifts";
import { Route as ManagerProfile } from "./roles/manager/pages/Profile";
import { Route as ManagerRooms } from "./roles/manager/pages/Rooms";
import { Route as ManagerViewGuest } from "./roles/manager/pages/ViewGuest";
import { Route as ManagerViewApproval } from "./roles/manager/pages/ViewApproval";
import { Route as ManagerViewStaff } from "./roles/manager/pages/ViewStaff";
import { Route as ManagerAddStaff } from "./roles/manager/pages/AddStaff";
import { Route as ManagerEditStaff } from "./roles/manager/pages/EditStaff";
import { Route as ManagerViewShift } from "./roles/manager/pages/ViewShift";
import { Route as ManagerAttendance } from "./roles/manager/pages/Attendance";
import { Route as ManagerViewAttendance } from "./roles/manager/pages/ViewAttendance";

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
import { Route as ReceptionPaymentDetails } from "./roles/receptionist/pages/PaymentDetails";
import { Route as ReceptionReservations } from "./roles/receptionist/pages/Reservations";
import { Route as ReceptionRoomAssignment } from "./roles/receptionist/pages/RoomAssignment";
import { Route as ReceptionProfile } from "./roles/receptionist/pages/Profile";
import { Route as ReceptionCheckInDetails } from "./roles/receptionist/pages/CheckInDetails";
import { Route as ReceptionCheckOutDetails } from "./roles/receptionist/pages/CheckOutDetails";
import { Route as ReceptionFolioDetails } from "./roles/receptionist/pages/FolioDetails";
import { Route as ReceptionReservationDetails } from "./roles/receptionist/pages/ReservationDetails";
import { Route as ReceptionExtendReservation } from "./roles/receptionist/pages/ExtendReservation";
import { Route as ReceptionRoomDetails } from "./roles/receptionist/pages/RoomDetails";
import { Route as ReceptionGuestDetails } from "./roles/receptionist/pages/GuestDetails";
import { Route as ReceptionNotificationDetails } from "./roles/receptionist/pages/NotificationDetails";
import { Route as ReceptionFeedback } from "./roles/receptionist/pages/Feedback";
import { Route as ReceptionViewFeedback } from "./roles/receptionist/pages/ViewFeedback";

// Import Guest Workspace Pages
import { Route as GuestLayout } from "./roles/guest/pages/GuestLayout";
import { Route as GuestDashboard } from "./roles/guest/pages/Dashboard";
import { Route as GuestBooking } from "./roles/guest/pages/Booking";
import { Route as GuestBookings } from "./roles/guest/pages/Bookings";
import { Route as GuestFolio } from "./roles/guest/pages/Folio";
import { Route as GuestNotifications } from "./roles/guest/pages/Notifications";
import { Route as GuestPayment } from "./roles/guest/pages/Payment";
import { Route as GuestPreCheckIn } from "./roles/guest/pages/PreCheckIn";
import { Route as GuestProfile } from "./roles/guest/pages/Profile";
import { Route as GuestReviews } from "./roles/guest/pages/Reviews";
import { Route as GuestAddFeedback } from "./roles/guest/pages/AddFeedback";
import { Route as GuestSearch } from "./roles/guest/pages/Search";
import { Route as GuestServices } from "./roles/guest/pages/Services";
import { Route as GuestCurrentStay } from "./roles/guest/pages/CurrentStay";
import { Route as GuestInvoices } from "./roles/guest/pages/Invoices";
import { Route as GuestRefundRequest } from "./roles/guest/pages/RefundRequest";
import { Route as GuestSettings } from "./roles/guest/pages/Settings";

// Import Super Admin Workspace Pages
import { Route as SuperAdminLayout } from "./roles/super-admin/pages/SuperAdminLayout";
import { Route as SuperAdminDashboard } from "./roles/super-admin/pages/Dashboard";
import { Route as SuperAdminChannelManager } from "./roles/super-admin/pages/ChannelManager";
import { Route as SuperAdminContactRequests } from "./roles/super-admin/pages/ContactRequests";
import { Route as SuperAdminViewContactRequest } from "./roles/super-admin/pages/ViewContactRequest";
import { Route as SuperAdminReplyContactRequest } from "./roles/super-admin/pages/ReplyContactRequest";
import { Route as SuperAdminNotifications } from "./roles/super-admin/pages/Notifications";
import { Route as SuperAdminNotificationDetails } from "./roles/super-admin/pages/NotificationDetails";
import { Route as SuperAdminOccupancy } from "./roles/super-admin/pages/Occupancy";
import { Route as SuperAdminCoupons } from "./roles/super-admin/pages/Coupons";
import { Route as SuperAdminAddCoupon } from "./roles/super-admin/pages/AddCoupon";
import { Route as SuperAdminEditCoupon } from "./roles/super-admin/pages/EditCoupon";
import { Route as SuperAdminViewCoupon } from "./roles/super-admin/pages/ViewCoupon";
import { Route as SuperAdminProperties } from "./roles/super-admin/pages/Properties";
import { Route as SuperAdminAddProperty } from "./roles/super-admin/pages/AddProperty";
import { Route as SuperAdminViewProperty } from "./roles/super-admin/pages/ViewProperty";
import { Route as SuperAdminEditProperty } from "./roles/super-admin/pages/EditProperty";
import { Route as SuperAdminReports } from "./roles/super-admin/pages/Reports";
import { Route as SuperAdminViewReport } from "./roles/super-admin/pages/ViewReport";
import { Route as SuperAdminReservations } from "./roles/super-admin/pages/Reservations";
import { Route as SuperAdminViewReservation } from "./roles/super-admin/pages/ViewSuperReservation";
import { Route as SuperAdminUsers } from "./roles/super-admin/pages/Users";
import { Route as SuperAdminViewGuest } from "./roles/super-admin/pages/ViewGuest";
import { Route as SuperAdminBranding } from "./roles/super-admin/pages/Branding";
import { Route as SuperAdminSubscription } from "./roles/super-admin/pages/Subscription";
import { Route as SuperAdminViewSubscriptionRequest } from "./roles/super-admin/pages/ViewSubscriptionRequest";
import { Route as SuperAdminAddPlan } from "./roles/super-admin/pages/AddPlan";
import { Route as SuperAdminEditPlan } from "./roles/super-admin/pages/EditPlan";
import { Route as SuperAdminViewPlan } from "./roles/super-admin/pages/ViewPlan";
import { Route as SuperAdminGlobalSettings } from "./roles/super-admin/pages/GlobalSettings";
import { Route as SuperAdminAdmins } from "./roles/super-admin/pages/Admins";
import { Route as SuperAdminAddAdmin } from "./roles/super-admin/pages/AddAdmin";
import { Route as SuperAdminEditAdmin } from "./roles/super-admin/pages/EditAdmin";
import { Route as SuperAdminViewAdmin } from "./roles/super-admin/pages/ViewAdmin";
import { Route as SuperAdminProfile } from "./roles/super-admin/pages/Profile";

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

function ProtectedRoute({ children, allowedRoles }) {
  const isAuthenticated = authService.isAuthenticated();
  const user = authService.getCurrentUser();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user?.role)) {
    const fallbackMap = {
      "super-admin": "/super-admin",
      "admin": "/admin",
      "manager": "/manager",
      "receptionist": "/reception",
      "guest": "/guest"
    };
    const redirectPath = fallbackMap[user?.role] || "/login";
    return <Navigate to={redirectPath} replace />;
  }

  return children;
}

function AuthRoutesLayout() {
  return (
    <AuthLayout>
      <Outlet />
    </AuthLayout>
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
          <Route path="/hotels" element={<RouteWrapper routeObj={Search} />} />
          <Route path="/hotels/:propertyId" element={<RouteWrapper routeObj={HotelDetails} />} />
          <Route path="/rooms/:roomId" element={<RouteWrapper routeObj={RoomDetails} />} />
          <Route path="/blog" element={<RouteWrapper routeObj={BlogIndex} />} />
          <Route path="/blog/:slug" element={<RouteWrapper routeObj={BlogPost} />} />
          
          {/* Shared Auth Layout Routes */}
          <Route element={<AuthRoutesLayout />}>
            <Route path="/login" element={<RouteWrapper routeObj={Login} />} />
            <Route path="/register" element={<RouteWrapper routeObj={Register} />} />
            <Route path="/forgot-password" element={<RouteWrapper routeObj={ForgotPassword} />} />
            <Route path="/reset-password" element={<RouteWrapper routeObj={ResetPassword} />} />
            <Route path="/verify-otp" element={<RouteWrapper routeObj={VerifyOtp} />} />
            <Route path="/otp" element={<RouteWrapper routeObj={VerifyOtp} />} />
          </Route>

          <Route path="/booking" element={<RouteWrapper routeObj={BookingIndex} />} />
          <Route path="/booking/confirmation" element={<RouteWrapper routeObj={BookingConfirmation} />} />

          {/* Admin Workspace */}
          <Route element={<ProtectedRoute allowedRoles={["admin"]}><RouteWrapper routeObj={AdminLayout} /></ProtectedRoute>}>
            <Route path="/admin" element={<RouteWrapper routeObj={AdminDashboard} />} />
            <Route path="/admin/approvals" element={<RouteWrapper routeObj={AdminApprovals} />} />
            <Route path="/admin/approvals/view/:id" element={<RouteWrapper routeObj={AdminViewApproval} />} />
            <Route path="/admin/approvals/:id" element={<RouteWrapper routeObj={AdminViewApproval} />} />
            <Route path="/admin/billing" element={<RouteWrapper routeObj={AdminBilling} />} />
            <Route path="/admin/channels" element={<RouteWrapper routeObj={AdminChannels} />} />
            <Route path="/admin/guests" element={<RouteWrapper routeObj={AdminGuests} />} />
            <Route path="/admin/guests/add" element={<RouteWrapper routeObj={AdminAddGuest} />} />
            <Route path="/admin/guests/edit/:id" element={<RouteWrapper routeObj={AdminEditGuest} />} />
            <Route path="/admin/guests/view/:id" element={<RouteWrapper routeObj={AdminViewGuest} />} />
            <Route path="/admin/guests/view" element={<RouteWrapper routeObj={AdminViewGuest} />} />
            <Route path="/admin/notifications" element={<RouteWrapper routeObj={AdminNotifications} />} />
            <Route path="/admin/notifications/:id" element={<RouteWrapper routeObj={AdminNotificationDetails} />} />
            <Route path="/admin/payments" element={<RouteWrapper routeObj={AdminPayments} />} />
            <Route path="/admin/payments/:id" element={<RouteWrapper routeObj={AdminPaymentDetails} />} />
            <Route path="/admin/payments/view/:id" element={<RouteWrapper routeObj={AdminPaymentDetails} />} />
            <Route path="/admin/reports" element={<RouteWrapper routeObj={AdminReports} />} />
            <Route path="/admin/reservations" element={<RouteWrapper routeObj={AdminReservations} />} />
            <Route path="/admin/reservations/add" element={<RouteWrapper routeObj={AdminAddReservation} />} />
            <Route path="/admin/reservations/edit/:id" element={<RouteWrapper routeObj={AdminEditReservation} />} />
            <Route path="/admin/reservations/view/:id" element={<RouteWrapper routeObj={AdminViewReservation} />} />
            <Route path="/admin/reservations/extend/:id" element={<RouteWrapper routeObj={AdminExtendReservation} />} />
            <Route path="/admin/reservations/extend" element={<RouteWrapper routeObj={AdminExtendReservation} />} />
            <Route path="/admin/rooms" element={<RouteWrapper routeObj={AdminRooms} />} />
            <Route path="/admin/rooms/add" element={<RouteWrapper routeObj={AdminAddRoom} />} />
            <Route path="/admin/rooms/add-type" element={<RouteWrapper routeObj={AdminAddRoomType} />} />
            <Route path="/admin/rooms/view/:id" element={<RouteWrapper routeObj={AdminViewRoom} />} />
            <Route path="/admin/rooms/edit/:id" element={<RouteWrapper routeObj={AdminEditRoom} />} />
            <Route path="/admin/rooms/edit-type/:id" element={<RouteWrapper routeObj={AdminEditRoomType} />} />
            <Route path="/admin/settings" element={<RouteWrapper routeObj={AdminSettings} />} />
            <Route path="/admin/staff" element={<RouteWrapper routeObj={AdminStaff} />} />
            <Route path="/admin/staff/add" element={<RouteWrapper routeObj={AdminAddStaff} />} />
            <Route path="/admin/staff/edit/:id" element={<RouteWrapper routeObj={AdminEditStaff} />} />
            <Route path="/admin/staff/view/:id" element={<RouteWrapper routeObj={AdminViewStaff} />} />
            <Route path="/admin/taxes" element={<RouteWrapper routeObj={AdminTaxes} />} />
            <Route path="/admin/feedback" element={<RouteWrapper routeObj={AdminFeedback} />} />
            <Route path="/admin/feedback/view/:id" element={<RouteWrapper routeObj={AdminViewFeedback} />} />
            <Route path="/admin/feedback/:id" element={<RouteWrapper routeObj={AdminViewFeedback} />} />
            <Route path="/admin/crm" element={<RouteWrapper routeObj={AdminCrm} />} />
            <Route path="/admin/subscription" element={<RouteWrapper routeObj={AdminSubscription} />} />
            <Route path="/admin/coupons" element={<RouteWrapper routeObj={AdminCoupons} />} />
            <Route path="/admin/coupons/add" element={<RouteWrapper routeObj={AdminAddCoupon} />} />
            <Route path="/admin/coupons/edit/:id" element={<RouteWrapper routeObj={AdminEditCoupon} />} />
            <Route path="/admin/coupons/view/:id" element={<RouteWrapper routeObj={AdminViewCoupon} />} />
            <Route path="/admin/check-in/:id" element={<RouteWrapper routeObj={AdminCheckInDetails} />} />
            <Route path="/admin/profile" element={<RouteWrapper routeObj={AdminProfile} />} />
          </Route>

          {/* Manager Workspace */}
          <Route element={<ProtectedRoute allowedRoles={["manager"]}><RouteWrapper routeObj={ManagerLayout} /></ProtectedRoute>}>
            <Route path="/manager" element={<RouteWrapper routeObj={ManagerDashboard} />} />
            <Route path="/manager/approvals" element={<RouteWrapper routeObj={ManagerApprovals} />} />
            <Route path="/manager/approvals/view/:id" element={<RouteWrapper routeObj={ManagerViewApproval} />} />
            <Route path="/manager/operations" element={<RouteWrapper routeObj={ManagerArrivals} />} />
            <Route path="/manager/feedback" element={<RouteWrapper routeObj={ManagerFeedback} />} />
            <Route path="/manager/feedback/view/:id" element={<RouteWrapper routeObj={ManagerViewFeedback} />} />
            <Route path="/manager/billing" element={<RouteWrapper routeObj={ManagerBilling} />} />
            <Route path="/manager/billing/view/:id" element={<RouteWrapper routeObj={ManagerViewBilling} />} />
            <Route path="/manager/payments" element={<RouteWrapper routeObj={ManagerPayments} />} />
            <Route path="/manager/payments/:id" element={<RouteWrapper routeObj={ManagerPaymentDetails} />} />
            <Route path="/manager/payments/view/:id" element={<RouteWrapper routeObj={ManagerPaymentDetails} />} />
            <Route path="/manager/guests" element={<RouteWrapper routeObj={ManagerGuests} />} />
            <Route path="/manager/guests/view/:id" element={<RouteWrapper routeObj={ManagerViewGuest} />} />
            <Route path="/manager/notifications" element={<RouteWrapper routeObj={ManagerNotifications} />} />
            <Route path="/manager/notifications/:id" element={<RouteWrapper routeObj={ManagerNotificationDetails} />} />
            <Route path="/manager/occupancy" element={<RouteWrapper routeObj={ManagerOccupancy} />} />
            <Route path="/manager/reports" element={<RouteWrapper routeObj={ManagerReports} />} />
            <Route path="/manager/reports/view/:id" element={<RouteWrapper routeObj={ManagerViewReport} />} />
            <Route path="/manager/reservations" element={<RouteWrapper routeObj={ManagerReservations} />} />
            <Route path="/manager/reservations/add" element={<RouteWrapper routeObj={ManagerAddReservation} />} />
            <Route path="/manager/reservations/new" element={<RouteWrapper routeObj={ManagerAddReservation} />} />
            <Route path="/manager/reservations/view/:id" element={<RouteWrapper routeObj={ManagerViewReservation} />} />
            <Route path="/manager/reservations/edit/:id" element={<RouteWrapper routeObj={ManagerEditReservation} />} />
            <Route path="/manager/reservations/extend/:id" element={<RouteWrapper routeObj={ManagerExtendReservation} />} />
            <Route path="/manager/reservations/extend" element={<RouteWrapper routeObj={ManagerExtendReservation} />} />
            <Route path="/manager/check-in/:id" element={<RouteWrapper routeObj={ManagerCheckInDetails} />} />
            <Route path="/manager/rooms" element={<RouteWrapper routeObj={ManagerRooms} />} />
            <Route path="/manager/shifts" element={<RouteWrapper routeObj={ManagerShifts} />} />
            <Route path="/manager/attendance" element={<RouteWrapper routeObj={ManagerAttendance} />} />
            <Route path="/manager/attendance/view/:id" element={<RouteWrapper routeObj={ManagerViewAttendance} />} />
            <Route path="/manager/staff/view/:id" element={<RouteWrapper routeObj={ManagerViewStaff} />} />
            <Route path="/manager/staff/add" element={<RouteWrapper routeObj={ManagerAddStaff} />} />
            <Route path="/manager/staff/edit/:id" element={<RouteWrapper routeObj={ManagerEditStaff} />} />
            <Route path="/manager/shifts/view/:id" element={<RouteWrapper routeObj={ManagerViewShift} />} />
            <Route path="/manager/profile" element={<RouteWrapper routeObj={ManagerProfile} />} />
          </Route>

          {/* Receptionist Workspace */}
          <Route element={<ProtectedRoute allowedRoles={["receptionist"]}><RouteWrapper routeObj={ReceptionLayout} /></ProtectedRoute>}>
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
            <Route path="/reception/payments/:id" element={<RouteWrapper routeObj={ReceptionPaymentDetails} />} />
            <Route path="/reception/payments/view/:id" element={<RouteWrapper routeObj={ReceptionPaymentDetails} />} />
            <Route path="/reception/reservations" element={<RouteWrapper routeObj={ReceptionReservations} />} />
            <Route path="/reception/room-assignment" element={<RouteWrapper routeObj={ReceptionRoomAssignment} />} />
            <Route path="/reception/feedback" element={<RouteWrapper routeObj={ReceptionFeedback} />} />
            <Route path="/reception/feedback/view/:id" element={<RouteWrapper routeObj={ReceptionViewFeedback} />} />
            <Route path="/reception/feedback/:id" element={<RouteWrapper routeObj={ReceptionViewFeedback} />} />
            <Route path="/reception/profile" element={<RouteWrapper routeObj={ReceptionProfile} />} />
            <Route path="/reception/check-in/:id" element={<RouteWrapper routeObj={ReceptionCheckInDetails} />} />
            <Route path="/reception/check-out/:id" element={<RouteWrapper routeObj={ReceptionCheckOutDetails} />} />
            <Route path="/reception/folio/:id" element={<RouteWrapper routeObj={ReceptionFolioDetails} />} />
            <Route path="/reception/reservations/:id" element={<RouteWrapper routeObj={ReceptionReservationDetails} />} />
            <Route path="/reception/reservations/extend/:id" element={<RouteWrapper routeObj={ReceptionExtendReservation} />} />
            <Route path="/reception/reservations/extend" element={<RouteWrapper routeObj={ReceptionExtendReservation} />} />
            <Route path="/reception/extend/:id" element={<RouteWrapper routeObj={ReceptionExtendReservation} />} />
            <Route path="/reception/extend" element={<RouteWrapper routeObj={ReceptionExtendReservation} />} />
            <Route path="/reception/room-assignment/:id" element={<RouteWrapper routeObj={ReceptionRoomDetails} />} />
            <Route path="/reception/guest-search/:id" element={<RouteWrapper routeObj={ReceptionGuestDetails} />} />
            <Route path="/reception/notifications/:id" element={<RouteWrapper routeObj={ReceptionNotificationDetails} />} />
          </Route>

          {/* Guest Workspace */}
          <Route element={<ProtectedRoute allowedRoles={["guest"]}><RouteWrapper routeObj={GuestLayout} /></ProtectedRoute>}>
            <Route path="/guest" element={<RouteWrapper routeObj={GuestDashboard} />} />
            <Route path="/guest/booking" element={<RouteWrapper routeObj={GuestBooking} />} />
            <Route path="/guest/bookings" element={<RouteWrapper routeObj={GuestBookings} />} />
            <Route path="/guest/bookings/:id" element={<RouteWrapper routeObj={GuestBookings} />} />
            <Route path="/guest/folio" element={<RouteWrapper routeObj={GuestFolio} />} />
            <Route path="/guest/folio/:id" element={<RouteWrapper routeObj={GuestFolio} />} />
            <Route path="/guest/notifications" element={<RouteWrapper routeObj={GuestNotifications} />} />
            <Route path="/guest/payment" element={<RouteWrapper routeObj={GuestPayment} />} />
            <Route path="/guest/pre-check-in" element={<RouteWrapper routeObj={GuestPreCheckIn} />} />
            <Route path="/guest/profile" element={<RouteWrapper routeObj={GuestProfile} />} />
            <Route path="/guest/feedback" element={<RouteWrapper routeObj={GuestReviews} />} />
            <Route path="/guest/feedback/add" element={<RouteWrapper routeObj={GuestAddFeedback} />} />
            <Route path="/guest/feedback/new" element={<RouteWrapper routeObj={GuestAddFeedback} />} />
            <Route path="/guest/reviews" element={<RouteWrapper routeObj={GuestReviews} />} />
            <Route path="/guest/reviews/add" element={<RouteWrapper routeObj={GuestAddFeedback} />} />
            <Route path="/guest/search" element={<RouteWrapper routeObj={GuestSearch} />} />
            <Route path="/guest/services" element={<RouteWrapper routeObj={GuestServices} />} />
            <Route path="/guest/current-stay" element={<RouteWrapper routeObj={GuestCurrentStay} />} />
            <Route path="/guest/invoices" element={<RouteWrapper routeObj={GuestInvoices} />} />
            <Route path="/guest/refund" element={<RouteWrapper routeObj={GuestRefundRequest} />} />
            <Route path="/guest/refund/:id" element={<RouteWrapper routeObj={GuestRefundRequest} />} />
            <Route path="/guest/refund-request" element={<RouteWrapper routeObj={GuestRefundRequest} />} />
            <Route path="/guest/refund-request/:id" element={<RouteWrapper routeObj={GuestRefundRequest} />} />
            <Route path="/guest/settings" element={<RouteWrapper routeObj={GuestSettings} />} />
          </Route>

          {/* Super Admin Workspace */}
          <Route element={<ProtectedRoute allowedRoles={["super-admin"]}><RouteWrapper routeObj={SuperAdminLayout} /></ProtectedRoute>}>
            <Route path="/super-admin" element={<RouteWrapper routeObj={SuperAdminDashboard} />} />
            <Route path="/super-admin/channel-manager" element={<RouteWrapper routeObj={SuperAdminChannelManager} />} />
            <Route path="/super-admin/notifications" element={<RouteWrapper routeObj={SuperAdminNotifications} />} />
            <Route path="/super-admin/notifications/:id" element={<RouteWrapper routeObj={SuperAdminNotificationDetails} />} />
            <Route path="/super-admin/occupancy" element={<RouteWrapper routeObj={SuperAdminOccupancy} />} />
            <Route path="/super-admin/properties" element={<RouteWrapper routeObj={SuperAdminProperties} />} />
            <Route path="/super-admin/properties/add" element={<RouteWrapper routeObj={SuperAdminAddProperty} />} />
            <Route path="/super-admin/properties/view/:id" element={<RouteWrapper routeObj={SuperAdminViewProperty} />} />
            <Route path="/super-admin/properties/edit/:id" element={<RouteWrapper routeObj={SuperAdminEditProperty} />} />
            <Route path="/super-admin/contacts" element={<RouteWrapper routeObj={SuperAdminContactRequests} />} />
            <Route path="/super-admin/contacts/view" element={<RouteWrapper routeObj={SuperAdminViewContactRequest} />} />
            <Route path="/super-admin/contacts/view/:id" element={<RouteWrapper routeObj={SuperAdminViewContactRequest} />} />
            <Route path="/super-admin/contacts/reply" element={<RouteWrapper routeObj={SuperAdminReplyContactRequest} />} />
            <Route path="/super-admin/contacts/reply/:id" element={<RouteWrapper routeObj={SuperAdminReplyContactRequest} />} />
            <Route path="/super-admin/reports" element={<RouteWrapper routeObj={SuperAdminReports} />} />
            <Route path="/super-admin/reports/view/:id" element={<RouteWrapper routeObj={SuperAdminViewReport} />} />
            <Route path="/super-admin/reservations" element={<RouteWrapper routeObj={SuperAdminReservations} />} />
            <Route path="/super-admin/reservations/view/:id" element={<RouteWrapper routeObj={SuperAdminViewReservation} />} />
            <Route path="/super-admin/users" element={<RouteWrapper routeObj={SuperAdminUsers} />} />
            <Route path="/super-admin/users/view/:id" element={<RouteWrapper routeObj={SuperAdminViewGuest} />} />
            <Route path="/super-admin/admins" element={<RouteWrapper routeObj={SuperAdminAdmins} />} />
            <Route path="/super-admin/admins/add" element={<RouteWrapper routeObj={SuperAdminAddAdmin} />} />
            <Route path="/super-admin/admins/edit/:id" element={<RouteWrapper routeObj={SuperAdminEditAdmin} />} />
            <Route path="/super-admin/admins/view/:id" element={<RouteWrapper routeObj={SuperAdminViewAdmin} />} />
            <Route path="/super-admin/branding" element={<RouteWrapper routeObj={SuperAdminBranding} />} />
            <Route path="/super-admin/subscription" element={<RouteWrapper routeObj={SuperAdminSubscription} />} />
            <Route path="/super-admin/subscription/requests/view/:id" element={<RouteWrapper routeObj={SuperAdminViewSubscriptionRequest} />} />
            <Route path="/super-admin/subscription/add" element={<RouteWrapper routeObj={SuperAdminAddPlan} />} />
            <Route path="/super-admin/subscription/edit/:id" element={<RouteWrapper routeObj={SuperAdminEditPlan} />} />
            <Route path="/super-admin/subscription/view/:id" element={<RouteWrapper routeObj={SuperAdminViewPlan} />} />
            <Route path="/super-admin/global-settings" element={<RouteWrapper routeObj={SuperAdminGlobalSettings} />} />
            <Route path="/super-admin/coupons" element={<RouteWrapper routeObj={SuperAdminCoupons} />} />
            <Route path="/super-admin/coupons/add" element={<RouteWrapper routeObj={SuperAdminAddCoupon} />} />
            <Route path="/super-admin/coupons/edit/:id" element={<RouteWrapper routeObj={SuperAdminEditCoupon} />} />
            <Route path="/super-admin/coupons/view/:id" element={<RouteWrapper routeObj={SuperAdminViewCoupon} />} />
            <Route path="/super-admin/profile" element={<RouteWrapper routeObj={SuperAdminProfile} />} />
          </Route>
        </Routes>
        <Toaster />
      </BrowserRouter>
    </QueryClientProvider>
  );
}
