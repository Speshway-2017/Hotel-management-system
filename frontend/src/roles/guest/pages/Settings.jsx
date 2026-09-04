import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { 
  User, Lock, Bell, Globe, Save, RefreshCw, AlertCircle, 
  CheckCircle2, Shield, Eye, EyeOff, KeyRound, Sparkles, Mail, Phone, MapPin 
} from "lucide-react";

export const Route = createFileRoute("/guest/settings")({
  head: () => ({
    meta: [
      { title: "Settings — Hour Stay" },
      { name: "description", content: "Manage your guest profile, notification preferences, account security and password." }
    ]
  }),
  component: GuestSettingsPage
});

function GuestSettingsPage() {
  const [activeTab, setActiveTab] = useState("account"); // 'account', 'notifications'
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingNotifs, setSavingNotifs] = useState(false);

  // Status Alerts
  const [profileMsg, setProfileMsg] = useState({ type: "", text: "" });
  const [notifMsg, setNotifMsg] = useState({ type: "", text: "" });

  // 1. Profile Information State
  const [profile, setProfile] = useState({
    name: "",
    email: "",
    mobile: "",
    city: "",
    address: "",
    language: "English (IN)",
    currency: "INR (₹)"
  });

  // 2. Notification Preferences State
  const [notifications, setNotifications] = useState({
    emailConfirmations: true,
    smsAlerts: true,
    promotionalOffers: false,
    checkInReminders: true
  });

  // 3. Change Password State
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);

  // Load Real Guest Profile Data from MongoDB API
  const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

  const fetchProfileData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('hms_token');
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`${API_URL}/v1/guest/profile`, { headers });
      const result = await res.json();

      if (result && result.success && result.data) {
        const d = result.data;
        setProfile({
          name: d.name || "",
          email: d.email || "",
          mobile: d.mobile || "",
          city: d.city || "Hyderabad",
          address: d.address || "Hitech City, Hyderabad, Telangana",
          language: d.language || "English (IN)",
          currency: d.currency || "INR (₹)"
        });

        if (d.notifications) {
          setNotifications(d.notifications);
        }
      }
    } catch (err) {
      console.error("Failed to load profile data:", err);
      // Fallback from localStorage user session
      const cached = localStorage.getItem('hms_user');
      if (cached) {
        try {
          const u = JSON.parse(cached);
          setProfile({
            name: u.name || "Guest",
            email: u.email || "",
            mobile: u.mobile || u.phone || "",
            city: u.city || "Hyderabad",
            address: u.address || "Hitech City, Hyderabad, Telangana",
            language: "English (IN)",
            currency: "INR (₹)"
          });
        } catch (e) {}
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfileData();
  }, []);

  // Update Profile Form Handler
  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    setProfileMsg({ type: "", text: "" });

    try {
      const token = localStorage.getItem('hms_token');
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`${API_URL}/v1/guest/profile`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(profile)
      });
      const result = await res.json();

      if (result && result.success) {
        setProfileMsg({ type: "success", text: "Profile information updated successfully in MongoDB." });
        // Update cached session user
        const cached = localStorage.getItem('hms_user');
        if (cached) {
          try {
            const u = JSON.parse(cached);
            localStorage.setItem('hms_user', JSON.stringify({ ...u, ...profile }));
          } catch (err) {}
        }
      } else {
        setProfileMsg({ type: "error", text: result.message || "Failed to update profile." });
      }
    } catch (err) {
      console.error("Profile update error:", err);
      setProfileMsg({ type: "error", text: "Network error. Unable to connect to server." });
    } finally {
      setSavingProfile(false);
    }
  };

  // Change Password Handler
  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!passwordForm.currentPassword) {
      setPasswordMsg({ type: "error", text: "Please enter your current password." });
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      setPasswordMsg({ type: "error", text: "New password must be at least 6 characters long." });
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordMsg({ type: "error", text: "New password and confirmation do not match." });
      return;
    }

    setSavingPassword(true);
    setPasswordMsg({ type: "", text: "" });

    try {
      const token = localStorage.getItem('hms_token');
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`${API_URL}/v1/guest/change-password`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword
        })
      });
      const result = await res.json();

      if (result && result.success) {
        setPasswordMsg({ type: "success", text: "Password changed successfully." });
        setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      } else {
        setPasswordMsg({ type: "error", text: result.message || "Current password is incorrect." });
      }
    } catch (err) {
      console.error("Password change error:", err);
      setPasswordMsg({ type: "error", text: "Network error. Failed to change password." });
    } finally {
      setSavingPassword(false);
    }
  };

  // Save Notifications Handler
  const handleSaveNotifications = async (e) => {
    e.preventDefault();
    setSavingNotifs(true);
    setNotifMsg({ type: "", text: "" });

    try {
      const token = localStorage.getItem('hms_token');
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`${API_URL}/v1/guest/notifications-settings`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ notifications })
      });
      const result = await res.json();

      if (result && result.success) {
        setNotifMsg({ type: "success", text: "Notification preferences saved successfully." });
      } else {
        setNotifMsg({ type: "error", text: result.message || "Failed to save preferences." });
      }
    } catch (err) {
      console.error("Notification settings error:", err);
      setNotifMsg({ type: "error", text: "Network error. Unable to save settings." });
    } finally {
      setSavingNotifs(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl p-16 border border-navy/5 text-center space-y-4 shadow-soft font-ui">
        <div className="mx-auto size-10 rounded-full border-4 border-purple border-t-transparent animate-spin" />
        <p className="text-xs font-semibold text-navy/60">Fetching guest profile settings from MongoDB...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-left font-ui">
      
      {/* Settings Navigation Tabs Panel */}
      <div className="bg-white rounded-2xl border border-navy/10 p-6 shadow-soft space-y-6">
        
        {/* Top Header & Navigation Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-start border-b border-navy/5 pb-4">
          <div className="flex rounded-xl border border-navy/10 bg-cream/30 p-1 gap-1 flex-wrap">
            {[
              { id: "account", label: "Account Settings", icon: Globe },
              { id: "notifications", label: "Notifications", icon: Bell }
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border-none inline-flex items-center gap-1.5 ${
                    activeTab === tab.id
                      ? "bg-navy text-cream shadow-sm"
                      : "text-navy/70 hover:text-navy hover:bg-cream/50"
                  }`}
                >
                  <Icon className="size-3.5" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* SECTION 1: PROFILE INFORMATION */}
        {activeTab === "profile" && (
          <form onSubmit={handleUpdateProfile} className="space-y-6 animate-fade-in">
            <div className="border-b border-navy/5 pb-3">
              <h3 className="font-display text-base font-bold text-navy flex items-center gap-2">
                <User className="size-4 text-purple" /> Personal Information
              </h3>
              <p className="text-xs text-navy/60">Update your verified contact and identity details stored in MongoDB</p>
            </div>

            {profileMsg.text && (
              <div className={`p-3.5 rounded-xl text-xs font-semibold flex items-center gap-2 ${
                profileMsg.type === "success"
                  ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                  : "bg-rose-50 text-rose-800 border border-rose-200"
              }`}>
                {profileMsg.type === "success" ? <CheckCircle2 className="size-4 text-emerald-600" /> : <AlertCircle className="size-4 text-rose-500" />}
                {profileMsg.text}
              </div>
            )}

            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-navy block">Full Guest Name</label>
                <div className="relative">
                  <User className="size-4 text-navy/40 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    value={profile.name}
                    onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                    required
                    placeholder="Guest Full Name"
                    className="w-full rounded-xl border border-navy/15 bg-cream/10 pl-10 pr-3.5 py-2.5 text-xs font-semibold text-navy focus:border-purple focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-navy block">Email Address</label>
                <div className="relative">
                  <Mail className="size-4 text-navy/40 absolute left-3.5 top-3" />
                  <input
                    type="email"
                    value={profile.email}
                    onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                    required
                    placeholder="guest@example.com"
                    className="w-full rounded-xl border border-navy/15 bg-cream/10 pl-10 pr-3.5 py-2.5 text-xs font-semibold text-navy focus:border-purple focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-navy block">Phone / Mobile Number</label>
                <div className="relative">
                  <Phone className="size-4 text-navy/40 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    value={profile.mobile}
                    onChange={(e) => setProfile({ ...profile, mobile: e.target.value })}
                    required
                    placeholder="+91 98765 43210"
                    className="w-full rounded-xl border border-navy/15 bg-cream/10 pl-10 pr-3.5 py-2.5 text-xs font-semibold text-navy focus:border-purple focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-navy block">City</label>
                <div className="relative">
                  <MapPin className="size-4 text-navy/40 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    value={profile.city}
                    onChange={(e) => setProfile({ ...profile, city: e.target.value })}
                    placeholder="Hyderabad"
                    className="w-full rounded-xl border border-navy/15 bg-cream/10 pl-10 pr-3.5 py-2.5 text-xs font-semibold text-navy focus:border-purple focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-bold text-navy block">Residential Address</label>
                <input
                  type="text"
                  value={profile.address}
                  onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                  placeholder="Hitech City, Hyderabad, Telangana"
                  className="w-full rounded-xl border border-navy/15 bg-cream/10 px-3.5 py-2.5 text-xs font-semibold text-navy focus:border-purple focus:outline-none"
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={savingProfile}
                className="px-6 py-2.5 bg-navy text-cream rounded-xl text-xs font-bold hover:bg-navy/90 transition-colors shadow-soft cursor-pointer inline-flex items-center gap-2 border-none disabled:opacity-50"
              >
                {savingProfile ? (
                  <>
                    <div className="size-3.5 border-2 border-cream border-t-transparent animate-spin rounded-full" />
                    Saving Changes...
                  </>
                ) : (
                  <>
                    <Save className="size-3.5" /> Save Profile Details
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* SECTION 2: ACCOUNT SETTINGS */}
        {activeTab === "account" && (
          <form onSubmit={handleUpdateProfile} className="space-y-6 animate-fade-in">
            <div className="border-b border-navy/5 pb-3">
              <h3 className="font-display text-base font-bold text-navy flex items-center gap-2">
                <Globe className="size-4 text-purple" /> Regional & Display Preferences
              </h3>
              <p className="text-xs text-navy/60">Configure portal language, billing currency, and display preferences</p>
            </div>

            {profileMsg.text && (
              <div className={`p-3.5 rounded-xl text-xs font-semibold flex items-center gap-2 ${
                profileMsg.type === "success"
                  ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                  : "bg-rose-50 text-rose-800 border border-rose-200"
              }`}>
                {profileMsg.type === "success" ? <CheckCircle2 className="size-4 text-emerald-600" /> : <AlertCircle className="size-4 text-rose-500" />}
                {profileMsg.text}
              </div>
            )}

            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-navy block">Portal Language</label>
                <select
                  value={profile.language}
                  onChange={(e) => setProfile({ ...profile, language: e.target.value })}
                  className="w-full rounded-xl border border-navy/15 bg-cream/10 px-3.5 py-2.5 text-xs font-semibold text-navy focus:border-purple focus:outline-none"
                >
                  <option value="English (IN)">English (India)</option>
                  <option value="Hindi">Hindi (हिंदी)</option>
                  <option value="Telugu">Telugu (తెలుగు)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-navy block">Preferred Currency</label>
                <select
                  value={profile.currency}
                  onChange={(e) => setProfile({ ...profile, currency: e.target.value })}
                  className="w-full rounded-xl border border-navy/15 bg-cream/10 px-3.5 py-2.5 text-xs font-semibold text-navy focus:border-purple focus:outline-none"
                >
                  <option value="INR (₹)">Indian Rupee (INR ₹)</option>
                  <option value="USD ($)">US Dollar (USD $)</option>
                  <option value="EUR (€)">Euro (EUR €)</option>
                </select>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={savingProfile}
                className="px-6 py-2.5 bg-navy text-cream rounded-xl text-xs font-bold hover:bg-navy/90 transition-colors shadow-soft cursor-pointer inline-flex items-center gap-2 border-none disabled:opacity-50"
              >
                {savingProfile ? "Saving..." : <><Save className="size-3.5" /> Save Preferences</>}
              </button>
            </div>
          </form>
        )}

        {/* SECTION 3: NOTIFICATION PREFERENCES */}
        {activeTab === "notifications" && (
          <form onSubmit={handleSaveNotifications} className="space-y-6 animate-fade-in">
            <div className="border-b border-navy/5 pb-3">
              <h3 className="font-display text-base font-bold text-navy flex items-center gap-2">
                <Bell className="size-4 text-purple" /> Notification Settings
              </h3>
              <p className="text-xs text-navy/60">Manage how you receive stay updates, invoices, and alerts</p>
            </div>

            {notifMsg.text && (
              <div className={`p-3.5 rounded-xl text-xs font-semibold flex items-center gap-2 ${
                notifMsg.type === "success"
                  ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                  : "bg-rose-50 text-rose-800 border border-rose-200"
              }`}>
                {notifMsg.type === "success" ? <CheckCircle2 className="size-4 text-emerald-600" /> : <AlertCircle className="size-4 text-rose-500" />}
                {notifMsg.text}
              </div>
            )}

            <div className="space-y-4">
              <div className="flex items-center justify-between py-3 border-b border-navy/5">
                <div>
                  <p className="text-xs font-bold text-navy">Email Booking Confirmations & Invoices</p>
                  <p className="text-[11px] text-navy/60">Receive instant reservation receipts and GST folios via email</p>
                </div>
                <input
                  type="checkbox"
                  checked={notifications.emailConfirmations}
                  onChange={(e) => setNotifications({ ...notifications, emailConfirmations: e.target.checked })}
                  className="size-4 rounded accent-purple cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between py-3 border-b border-navy/5">
                <div>
                  <p className="text-xs font-bold text-navy">SMS / WhatsApp Stay Alerts</p>
                  <p className="text-[11px] text-navy/60">Get mobile alerts for pre-check-in details, room ready notifications and checkout receipts</p>
                </div>
                <input
                  type="checkbox"
                  checked={notifications.smsAlerts}
                  onChange={(e) => setNotifications({ ...notifications, smsAlerts: e.target.checked })}
                  className="size-4 rounded accent-purple cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between py-3 border-b border-navy/5">
                <div>
                  <p className="text-xs font-bold text-navy">Check-in & Departure Reminders</p>
                  <p className="text-[11px] text-navy/60">Timely reminders prior to scheduled check-in and checkout times</p>
                </div>
                <input
                  type="checkbox"
                  checked={notifications.checkInReminders}
                  onChange={(e) => setNotifications({ ...notifications, checkInReminders: e.target.checked })}
                  className="size-4 rounded accent-purple cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between py-3">
                <div>
                  <p className="text-xs font-bold text-navy">Promotional Offers & Updates</p>
                  <p className="text-[11px] text-navy/60">Receive custom room discounts and seasonal stay offers</p>
                </div>
                <input
                  type="checkbox"
                  checked={notifications.promotionalOffers}
                  onChange={(e) => setNotifications({ ...notifications, promotionalOffers: e.target.checked })}
                  className="size-4 rounded accent-purple cursor-pointer"
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={savingNotifs}
                className="px-6 py-2.5 bg-navy text-cream rounded-xl text-xs font-bold hover:bg-navy/90 transition-colors shadow-soft cursor-pointer inline-flex items-center gap-2 border-none disabled:opacity-50"
              >
                {savingNotifs ? (
                  <>
                    <div className="size-3.5 border-2 border-cream border-t-transparent animate-spin rounded-full" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="size-3.5" /> Save Notification Settings
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* SECTION 4: CHANGE PASSWORD & SECURITY */}
        {activeTab === "security" && (
          <form onSubmit={handleChangePassword} className="space-y-6 animate-fade-in">
            <div className="border-b border-navy/5 pb-3">
              <h3 className="font-display text-base font-bold text-navy flex items-center gap-2">
                <KeyRound className="size-4 text-purple" /> Change Password & Security
              </h3>
              <p className="text-xs text-navy/60">Update your login password using bcrypt encryption</p>
            </div>

            {passwordMsg.text && (
              <div className={`p-3.5 rounded-xl text-xs font-semibold flex items-center gap-2 ${
                passwordMsg.type === "success"
                  ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                  : "bg-rose-50 text-rose-800 border border-rose-200"
              }`}>
                {passwordMsg.type === "success" ? <CheckCircle2 className="size-4 text-emerald-600" /> : <AlertCircle className="size-4 text-rose-500" />}
                {passwordMsg.text}
              </div>
            )}

            <div className="space-y-4 max-w-md">
              
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-navy block">Current Password</label>
                <div className="relative">
                  <input
                    type={showCurrentPass ? "text" : "password"}
                    value={passwordForm.currentPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                    required
                    placeholder="••••••••"
                    className="w-full rounded-xl border border-navy/15 bg-cream/10 px-3.5 py-2.5 pr-10 text-xs font-semibold text-navy focus:border-purple focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPass(!showCurrentPass)}
                    className="absolute right-3 top-3 text-navy/40 hover:text-navy cursor-pointer border-none bg-transparent"
                  >
                    {showCurrentPass ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-navy block">New Password</label>
                <div className="relative">
                  <input
                    type={showNewPass ? "text" : "password"}
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                    required
                    placeholder="Minimum 6 characters"
                    className="w-full rounded-xl border border-navy/15 bg-cream/10 px-3.5 py-2.5 pr-10 text-xs font-semibold text-navy focus:border-purple focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPass(!showNewPass)}
                    className="absolute right-3 top-3 text-navy/40 hover:text-navy cursor-pointer border-none bg-transparent"
                  >
                    {showNewPass ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-navy block">Confirm New Password</label>
                <input
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                  required
                  placeholder="Re-enter new password"
                  className="w-full rounded-xl border border-navy/15 bg-cream/10 px-3.5 py-2.5 text-xs font-semibold text-navy focus:border-purple focus:outline-none"
                />
              </div>

            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={savingPassword}
                className="px-6 py-2.5 bg-navy text-cream rounded-xl text-xs font-bold hover:bg-navy/90 transition-colors shadow-soft cursor-pointer inline-flex items-center gap-2 border-none disabled:opacity-50"
              >
                {savingPassword ? (
                  <>
                    <div className="size-3.5 border-2 border-cream border-t-transparent animate-spin rounded-full" />
                    Updating Password...
                  </>
                ) : (
                  <>
                    <Lock className="size-3.5" /> Update Password
                  </>
                )}
              </button>
            </div>
          </form>
        )}

      </div>

    </div>
  );
}
