import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Panel, Notice, Tag } from "@/components/hs/kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  User,
  Shield,
  Lock,
  LogOut,
  Mail,
  Phone,
  Key,
  Calendar,
  Eye,
  EyeOff,
  Camera,
  Star,
  MapPin,
  Globe,
  Award,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Trash2,
  Save,
  X
} from "lucide-react";
import { authService } from "@/services/auth";
import { subscribeRealtimeSync } from "@/services/socket";
import { validateWithZod, guestProfileSchema, changePasswordSchema } from "@/schemas";

export const Route = createFileRoute("/guest/profile")({
  head: () => ({
    meta: [
      { title: "Guest Profile — Hour Stay" },
      { name: "description", content: "Personal guest details, contact info, preferences, and account settings." }
    ]
  }),
  component: GuestProfilePage
});

function GuestProfilePage() {
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [profileErrors, setProfileErrors] = useState({});
  const [passwordErrors, setPasswordErrors] = useState({});

  // Account deletion dialog state
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [understandChecked, setUnderstandChecked] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteError, setDeleteError] = useState("");
  
  const currentUser = authService.getCurrentUser() || {};

  const [profileData, setProfileData] = useState({
    name: currentUser?.name || "Guest",
    email: currentUser?.email || "",
    phone: currentUser?.mobile || currentUser?.phone || "",
    city: currentUser?.city || "Hyderabad",
    address: currentUser?.address || "Hitech City, Hyderabad, Telangana",
    country: "India",
    role: "Guest Member",
    status: "Active",
    avatar: null,
    createdAt: "2026-08-01"
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmNewPassword: ""
  });

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [notification, setNotification] = useState(null);
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
        const fresh = result.data;
        const u = authService.getCurrentUser() || {};
        const updatedUser = {
          ...u,
          name: fresh.name || u?.name || "Guest",
          email: fresh.email || u?.email || "",
          mobile: fresh.mobile || fresh.phone || u?.mobile || "",
          phone: fresh.mobile || fresh.phone || u?.mobile || "",
          city: fresh.city || "Hyderabad",
          address: fresh.address || "Hitech City, Hyderabad",
          country: fresh.country || "India",
          avatar: fresh.avatar !== undefined ? fresh.avatar : u?.avatar
        };
        authService.setUser(updatedUser);
        setProfileData({
          name: fresh.name || u?.name || "Guest",
          email: fresh.email || u?.email || "",
          phone: fresh.mobile || fresh.phone || u?.mobile || "",
          city: fresh.city || "Hyderabad",
          address: fresh.address || "Hitech City, Hyderabad",
          country: fresh.country || "India",
          role: "Guest Member",
          status: "Active",
          avatar: fresh.avatar || u?.avatar || null,
          createdAt: fresh.createdAt ? new Date(fresh.createdAt).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) : "August 2026"
        });
      }
    } catch (err) {
      console.error("Failed to load profile data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfileData();
    const unsubscribe = subscribeRealtimeSync((event) => {
      if (event === 'user_updated' || event === 'guest_updated' || event === 'dashboard_sync') {
        fetchProfileData();
      }
    });
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setNotification({
      tone: "neutral",
      title: "Uploading...",
      body: "Uploading profile image..."
    });

    try {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileData(prev => ({ ...prev, avatar: reader.result }));
        setNotification({
          tone: "success",
          title: "Avatar Updated",
          body: "Your profile photo has been updated."
        });
      };
      reader.readAsDataURL(file);
    } catch (err) {
      setNotification({
        tone: "error",
        title: "Upload Failed",
        body: "Could not upload profile picture."
      });
    }
    setTimeout(() => setNotification(null), 4000);
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    const validation = validateWithZod(guestProfileSchema, {
      name: profileData.name,
      phone: profileData.phone,
      email: profileData.email || "guest@hourstay.com",
      city: profileData.city,
      country: profileData.country,
      address: profileData.address
    });

    if (!validation.isValid) {
      setProfileErrors(validation.errors);
      const firstError = Object.values(validation.errors)[0];
      setNotification({
        tone: "error",
        title: "Validation Error",
        body: firstError
      });
      return;
    }
    setProfileErrors({});
    setSaving(true);
    
    try {
      const token = localStorage.getItem('hms_token');
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`${API_URL}/v1/guest/profile`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          name: profileData.name,
          mobile: profileData.phone,
          city: profileData.city,
          address: profileData.address,
          country: profileData.country
        })
      });
      const result = await res.json();

      if (result && result.success) {
        setIsEditing(false);
        setNotification({
          tone: "success",
          title: "Profile Saved",
          body: "Your profile information has been updated successfully in MongoDB."
        });
      } else {
        setNotification({
          tone: "error",
          title: "Update Failed",
          body: result.message || "Failed to save profile changes."
        });
      }
    } catch (err) {
      setNotification({
        tone: "error",
        title: "Network Error",
        body: "Unable to connect to backend server."
      });
    } finally {
      setSaving(false);
    }
    setTimeout(() => setNotification(null), 4000);
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    const validation = validateWithZod(changePasswordSchema, {
      currentPassword: passwordData.currentPassword,
      newPassword: passwordData.newPassword,
      confirmPassword: passwordData.confirmNewPassword
    });

    if (!validation.isValid) {
      setPasswordErrors(validation.errors);
      const firstError = Object.values(validation.errors)[0];
      setNotification({
        tone: "error",
        title: "Validation Error",
        body: firstError
      });
      return;
    }
    setPasswordErrors({});

    try {
      const token = localStorage.getItem('hms_token');
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`${API_URL}/v1/guest/change-password`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword
        })
      });
      const result = await res.json();

      if (result && result.success) {
        setIsChangingPassword(false);
        setPasswordData({ currentPassword: "", newPassword: "", confirmNewPassword: "" });
        setNotification({
          tone: "success",
          title: "Credentials Saved",
          body: "Password updated successfully."
        });
      } else {
        setNotification({
          tone: "error",
          title: "Password Error",
          body: result.message || "Current password is incorrect."
        });
      }
    } catch (err) {
      setNotification({
        tone: "error",
        title: "Error",
        body: "Network error while updating password."
      });
    }
    setTimeout(() => setNotification(null), 4000);
  };

  const handleLogout = () => {
    authService.logout();
    window.location.href = "/login";
  };

  const handleConfirmDeleteAccount = async (e) => {
    if (e) e.preventDefault();
    if (!understandChecked) {
      setDeleteError("Please confirm that you understand this action is permanent.");
      return;
    }
    setIsDeletingAccount(true);
    setDeleteError("");
    try {
      const res = await authService.deleteAccount(deletePassword || undefined);
      if (res && (res.success !== false)) {
        setIsDeleteDialogOpen(false);
        setNotification({
          tone: "success",
          title: "Account Deleted",
          body: "Your Hour Stay account has been permanently deleted. Logging out..."
        });
        setTimeout(() => {
          window.location.href = "/";
        }, 1000);
      } else {
        setDeleteError(res?.message || "Failed to delete account. Please try again.");
        setIsDeletingAccount(false);
      }
    } catch (err) {
      setDeleteError(err?.response?.data?.message || err?.message || "An unexpected error occurred while deleting your account.");
      setIsDeletingAccount(false);
    }
  };

  const initials = profileData.name
    ? profileData.name.split(" ").map((n) => n[0]).join("").toUpperCase().substring(0, 2)
    : "AM";

  if (loading) {
    return (
      <div className="bg-white rounded-2xl p-16 border border-navy/5 text-center space-y-4 shadow-soft font-ui">
        <div className="mx-auto size-10 rounded-full border-4 border-purple border-t-transparent animate-spin" />
        <p className="text-xs font-semibold text-navy/60">Fetching guest profile details from MongoDB...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-left font-ui animate-fade-in">
      {notification && (
        <Notice tone={notification.tone} title={notification.title}>
          {notification.body}
        </Notice>
      )}

      <div className="grid gap-6 md:grid-cols-3">
        
        {/* Left Column Summary Card matching Admin/Manager style */}
        <div className="md:col-span-1 space-y-6">
          <div className="bg-white rounded-2xl border border-navy/10 p-6 shadow-soft text-center flex flex-col items-center">
            
            <div className="relative group">
              <Avatar className="size-24 border-[3px] border-navy/10 shadow-sm">
                <AvatarImage src={profileData.avatar || ""} alt={profileData.name} className="object-cover" />
                <AvatarFallback className="bg-navy text-2xl font-bold text-cream select-none">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <label
                htmlFor="avatar-upload"
                className="absolute bottom-0 right-0 bg-purple hover:bg-purple/90 text-cream rounded-full p-2 cursor-pointer shadow-md transition-all hover:scale-105 flex items-center justify-center border-2 border-white size-8"
                title="Upload new photo"
              >
                <Camera className="size-4" />
              </label>
              <input
                id="avatar-upload"
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="hidden"
              />
            </div>

            <h3 className="mt-4 font-display text-lg font-bold text-navy">{profileData.name}</h3>
            <p className="text-xs text-navy/60 mt-0.5 font-medium">{profileData.email}</p>
            
            <div className="mt-4 flex flex-wrap gap-1.5 justify-center">
              <Tag tone="brand">{profileData.role}</Tag>
              <Tag tone="success">{profileData.status}</Tag>
            </div>
            
            <div className="w-full border-t border-navy/5 my-5 pt-5 text-left text-xs space-y-3.5 font-medium">
              <div className="flex items-center gap-2.5 text-navy/70">
                <Mail className="size-4 text-purple shrink-0" />
                <span className="truncate">{profileData.email}</span>
              </div>
              <div className="flex items-center gap-2.5 text-navy/70">
                <Phone className="size-4 text-purple shrink-0" />
                <span>{profileData.phone}</span>
              </div>
              <div className="flex items-center gap-2.5 text-navy/70">
                <MapPin className="size-4 text-purple shrink-0" />
                <span>{profileData.city}, {profileData.country}</span>
              </div>
              <div className="flex items-center gap-2.5 text-navy/70">
                <Calendar className="size-4 text-purple shrink-0" />
                <span>Member since: {profileData.createdAt}</span>
              </div>
            </div>

            <div className="w-full space-y-2.5">
              <Button
                variant="destructive"
                onClick={handleLogout}
                className="w-full h-10 rounded-xl font-bold gap-2 text-xs uppercase tracking-wide cursor-pointer border-none bg-navy hover:bg-purple text-cream shadow-soft transition-all"
              >
                <LogOut className="size-4" />
                Sign Out
              </Button>
              <Button
                type="button"
                onClick={() => {
                  setDeleteError("");
                  setUnderstandChecked(false);
                  setDeletePassword("");
                  setIsDeleteDialogOpen(true);
                }}
                className="w-full h-10 rounded-xl font-bold gap-2 text-xs uppercase tracking-wide cursor-pointer border-none bg-blush hover:bg-blush/90 text-white shadow-soft transition-all"
              >
                <Trash2 className="size-4" />
                Delete Account
              </Button>
            </div>
          </div>
        </div>

        {/* Right Column Details & Edit Actions Panel */}
        <div className="md:col-span-2 space-y-6">
          
          {/* View Details Mode */}
          {!isEditing && !isChangingPassword && (
            <Panel title="Personal Guest Details" description="Your authenticated guest profile attributes stored in MongoDB.">
              <div className="p-6 bg-white rounded-b-2xl space-y-6 text-xs">
                <div className="grid gap-5 sm:grid-cols-2">
                  
                  <div className="space-y-1">
                    <p className="text-navy/50 font-bold uppercase tracking-wider text-[9px]">Full Name</p>
                    <p className="font-bold text-navy text-sm">{profileData.name}</p>
                  </div>

                  <div className="space-y-1">
                    <p className="text-navy/50 font-bold uppercase tracking-wider text-[9px]">Contact Phone</p>
                    <p className="font-bold text-navy text-sm">{profileData.phone}</p>
                  </div>

                  <div className="space-y-1">
                    <p className="text-navy/50 font-bold uppercase tracking-wider text-[9px]">Email Address</p>
                    <p className="font-bold text-navy text-sm">{profileData.email}</p>
                  </div>

                  <div className="space-y-1">
                    <p className="text-navy/50 font-bold uppercase tracking-wider text-[9px]">City & Region</p>
                    <p className="font-bold text-navy text-sm">{profileData.city}</p>
                  </div>

                  <div className="space-y-1 sm:col-span-2">
                    <p className="text-navy/50 font-bold uppercase tracking-wider text-[9px]">Residential Address</p>
                    <p className="font-bold text-navy text-sm">{profileData.address}</p>
                  </div>

                  <div className="space-y-1">
                    <p className="text-navy/50 font-bold uppercase tracking-wider text-[9px]">Country</p>
                    <p className="font-bold text-navy text-sm">{profileData.country}</p>
                  </div>

                  <div className="space-y-1">
                    <p className="text-navy/50 font-bold uppercase tracking-wider text-[9px]">Account Status</p>
                    <p className="font-bold text-emerald-600 text-sm">{profileData.status}</p>
                  </div>

                </div>

                <div className="pt-5 border-t border-navy/5 flex flex-wrap gap-3 justify-end">
                  <Button
                    onClick={() => setIsChangingPassword(true)}
                    variant="outline"
                    className="border-navy/15 text-navy hover:bg-cream/40 text-xs h-9 px-5 font-bold rounded-xl cursor-pointer"
                  >
                    <Key className="size-3.5 mr-1 text-purple" /> Change Password
                  </Button>
                  <Button
                    onClick={() => setIsEditing(true)}
                    className="bg-navy hover:bg-navy/90 text-cream text-xs h-9 px-6 font-bold shadow-soft rounded-xl cursor-pointer border-none"
                  >
                    Edit Profile Details
                  </Button>
                </div>
              </div>
            </Panel>
          )}

          {/* Edit Profile Mode */}
          {isEditing && (
            <Panel title="Modify Profile Information" description="Update your contact and location details in MongoDB.">
              <form onSubmit={handleProfileSubmit} className="p-6 bg-white rounded-b-2xl space-y-4 text-left">
                <div className="grid gap-4 sm:grid-cols-2">
                  
                  <div className="space-y-1.5">
                    <Label htmlFor="edit-name" required className="text-navy font-bold text-xs">Full Name</Label>
                    <Input
                      id="edit-name"
                      nameOnly
                      value={profileData.name}
                      onChange={(e) => {
                        setProfileData(prev => ({ ...prev, name: e.target.value }));
                        if (profileErrors.name) setProfileErrors(prev => ({ ...prev, name: undefined }));
                      }}
                      className={`h-10 text-xs border ${profileErrors.name ? "border-rose-500" : "border-navy/15"} font-semibold text-navy bg-cream/10 rounded-xl`}
                      required
                    />
                    {profileErrors.name && (
                      <p className="text-[11px] font-bold text-rose-600 mt-1">{profileErrors.name}</p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="edit-phone" required className="text-navy font-bold text-xs">Phone / Mobile</Label>
                    <Input
                      id="edit-phone"
                      type="tel"
                      value={profileData.phone}
                      onChange={(e) => {
                        setProfileData(prev => ({ ...prev, phone: e.target.value }));
                        if (profileErrors.phone) setProfileErrors(prev => ({ ...prev, phone: undefined }));
                      }}
                      className={`h-10 text-xs border ${profileErrors.phone ? "border-rose-500" : "border-navy/15"} font-semibold text-navy bg-cream/10 rounded-xl`}
                      required
                    />
                    {profileErrors.phone && (
                      <p className="text-[11px] font-bold text-rose-600 mt-1">{profileErrors.phone}</p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="edit-city" required className="text-navy font-bold text-xs">City</Label>
                    <Input
                      id="edit-city"
                      textOnly
                      value={profileData.city}
                      onChange={(e) => {
                        setProfileData(prev => ({ ...prev, city: e.target.value }));
                        if (profileErrors.city) setProfileErrors(prev => ({ ...prev, city: undefined }));
                      }}
                      className={`h-10 text-xs border ${profileErrors.city ? "border-rose-500" : "border-navy/15"} font-semibold text-navy bg-cream/10 rounded-xl`}
                      required
                    />
                    {profileErrors.city && (
                      <p className="text-[11px] font-bold text-rose-600 mt-1">{profileErrors.city}</p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="edit-country" required className="text-navy font-bold text-xs">Country</Label>
                    <Input
                      id="edit-country"
                      textOnly
                      value={profileData.country}
                      onChange={(e) => {
                        setProfileData(prev => ({ ...prev, country: e.target.value }));
                        if (profileErrors.country) setProfileErrors(prev => ({ ...prev, country: undefined }));
                      }}
                      className={`h-10 text-xs border ${profileErrors.country ? "border-rose-500" : "border-navy/15"} font-semibold text-navy bg-cream/10 rounded-xl`}
                      required
                    />
                    {profileErrors.country && (
                      <p className="text-[11px] font-bold text-rose-600 mt-1">{profileErrors.country}</p>
                    )}
                  </div>

                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor="edit-address" required className="text-navy font-bold text-xs">Address</Label>
                    <Input
                      id="edit-address"
                      value={profileData.address}
                      onChange={(e) => {
                        setProfileData(prev => ({ ...prev, address: e.target.value }));
                        if (profileErrors.address) setProfileErrors(prev => ({ ...prev, address: undefined }));
                      }}
                      className={`h-10 text-xs border ${profileErrors.address ? "border-rose-500" : "border-navy/15"} font-semibold text-navy bg-cream/10 rounded-xl`}
                      required
                    />
                    {profileErrors.address && (
                      <p className="text-[11px] font-bold text-rose-600 mt-1">{profileErrors.address}</p>
                    )}
                  </div>

                </div>

                <div className="flex gap-2.5 pt-4 justify-end">
                  <Button 
                    type="button" 
                    variant="ghost" 
                    onClick={() => setIsEditing(false)} 
                    className="text-navy text-xs font-bold rounded-xl px-5 h-9 cursor-pointer"
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={saving}
                    className="bg-purple hover:bg-purple/90 text-cream text-xs font-bold rounded-xl px-6 h-9 cursor-pointer border-none shadow-soft inline-flex items-center gap-2"
                  >
                    {saving ? (
                      <>
                        <div className="size-3.5 border-2 border-cream border-t-transparent animate-spin rounded-full" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="size-3.5" /> Save Changes
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </Panel>
          )}

          {/* Change Password Mode */}
          {isChangingPassword && (
            <Panel title="Change Account Password" description="Update your login password credentials.">
              <form onSubmit={handlePasswordSubmit} className="p-6 bg-white rounded-b-2xl space-y-4 text-left">
                <div className="space-y-1.5">
                  <Label htmlFor="current-pw" required className="text-navy font-bold text-xs">Current Password</Label>
                  <div className="relative">
                    <Input
                      id="current-pw"
                      type={showCurrentPassword ? "text" : "password"}
                      value={passwordData.currentPassword}
                      onChange={(e) => {
                        setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }));
                        if (passwordErrors.currentPassword) setPasswordErrors(prev => ({ ...prev, currentPassword: undefined }));
                      }}
                      className={`h-10 text-xs border ${passwordErrors.currentPassword ? "border-rose-500" : "border-navy/15"} font-semibold text-navy bg-cream/10 pr-10 rounded-xl`}
                      placeholder="••••••••"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-navy/40 hover:text-navy cursor-pointer flex items-center justify-center border-none bg-transparent"
                    >
                      {showCurrentPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                  {passwordErrors.currentPassword && (
                    <p className="text-[11px] font-bold text-rose-600 mt-1">{passwordErrors.currentPassword}</p>
                  )}
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="new-pw" required className="text-navy font-bold text-xs">New Password</Label>
                    <div className="relative">
                      <Input
                        id="new-pw"
                        type={showNewPassword ? "text" : "password"}
                        value={passwordData.newPassword}
                        onChange={(e) => {
                          setPasswordData(prev => ({ ...prev, newPassword: e.target.value }));
                          if (passwordErrors.newPassword) setPasswordErrors(prev => ({ ...prev, newPassword: undefined }));
                        }}
                        className={`h-10 text-xs border ${passwordErrors.newPassword ? "border-rose-500" : "border-navy/15"} font-semibold text-navy bg-cream/10 pr-10 rounded-xl`}
                        placeholder="••••••••"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-navy/40 hover:text-navy cursor-pointer flex items-center justify-center border-none bg-transparent"
                      >
                        {showNewPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                      </button>
                    </div>
                    {passwordErrors.newPassword && (
                      <p className="text-[11px] font-bold text-rose-600 mt-1">{passwordErrors.newPassword}</p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="confirm-new-pw" required className="text-navy font-bold text-xs">Confirm New Password</Label>
                    <div className="relative">
                      <Input
                        id="confirm-new-pw"
                        type={showConfirmPassword ? "text" : "password"}
                        value={passwordData.confirmNewPassword}
                        onChange={(e) => {
                          setPasswordData(prev => ({ ...prev, confirmNewPassword: e.target.value }));
                          if (passwordErrors.confirmPassword) setPasswordErrors(prev => ({ ...prev, confirmNewPassword: undefined }));
                        }}
                        className={`h-10 text-xs border ${passwordErrors.confirmPassword ? "border-rose-500" : "border-navy/15"} font-semibold text-navy bg-cream/10 pr-10 rounded-xl`}
                        placeholder="••••••••"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-navy/40 hover:text-navy cursor-pointer flex items-center justify-center border-none bg-transparent"
                      >
                        {showConfirmPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                      </button>
                    </div>
                    {passwordErrors.confirmPassword && (
                      <p className="text-[11px] font-bold text-rose-600 mt-1">{passwordErrors.confirmPassword}</p>
                    )}
                  </div>
                </div>

                <div className="flex gap-2.5 pt-4 justify-end">
                  <Button 
                    type="button" 
                    variant="ghost" 
                    onClick={() => setIsChangingPassword(false)} 
                    className="text-navy text-xs font-bold rounded-xl px-5 h-9 cursor-pointer"
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    className="bg-purple hover:bg-purple/90 text-cream text-xs font-bold rounded-xl px-6 h-9 cursor-pointer border-none shadow-soft"
                  >
                    Update Password
                  </Button>
                </div>
              </form>
            </Panel>
          )}

        </div>
      </div>

      {/* Confirmation Dialog Box Modal */}
      {isDeleteDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-navy/10 overflow-hidden text-left p-6 sm:p-8 space-y-5">
            
            <button
              type="button"
              onClick={() => {
                if (!isDeletingAccount) setIsDeleteDialogOpen(false);
              }}
              className="absolute top-5 right-5 text-navy/40 hover:text-navy p-1.5 rounded-xl hover:bg-navy/5 transition-colors cursor-pointer border-none bg-transparent"
            >
              <X className="size-5" />
            </button>

            <div className="flex items-start gap-4">
              <div className="size-12 rounded-2xl bg-blush/15 text-blush flex items-center justify-center shrink-0 border border-blush/25">
                <Trash2 className="size-6" />
              </div>
              <div className="space-y-1 pr-6">
                <h3 className="font-display text-lg sm:text-xl font-bold text-navy">
                  Confirm Account Deletion
                </h3>
                <p className="text-xs text-navy/60 font-medium">
                  Permanent deletion for <span className="font-bold text-blush">{profileData.email || profileData.name}</span>
                </p>
              </div>
            </div>

            <div className="bg-[#FAF9F5] rounded-2xl p-4 sm:p-5 border border-navy/10 text-xs text-navy/80 space-y-2 leading-relaxed">
              <p className="font-bold text-navy">When you delete your Hour Stay account:</p>
              <ul className="list-disc list-inside space-y-1.5 text-navy/70">
                <li>Your profile details, credentials, and member preferences will be permanently wiped.</li>
                <li>Your authenticated access to Hour Stay services will be immediately terminated.</li>
                <li>Completed stay folios and tax receipts are archived per accounting and statutory laws.</li>
              </ul>
            </div>

            {deleteError && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs font-bold text-rose-700 flex items-center gap-2">
                <AlertCircle className="size-4 shrink-0 text-rose-600" />
                <span>{deleteError}</span>
              </div>
            )}

            <label className="flex items-start gap-3 p-3.5 rounded-xl bg-[#FAF9F5] border border-navy/15 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={understandChecked}
                onChange={(e) => setUnderstandChecked(e.target.checked)}
                className="mt-0.5 size-4 accent-blush rounded cursor-pointer"
              />
              <span className="text-xs font-bold text-navy leading-snug">
                I understand that deleting my account is permanent, irreversible, and immediately logs me out.
              </span>
            </label>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                disabled={isDeletingAccount}
                onClick={() => setIsDeleteDialogOpen(false)}
                className="text-xs font-bold text-navy border-navy/20 hover:bg-cream rounded-xl px-5 h-10 cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="button"
                disabled={!understandChecked || isDeletingAccount}
                onClick={handleConfirmDeleteAccount}
                className="bg-blush hover:bg-blush/90 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl px-6 h-10 shadow-soft cursor-pointer border-none flex items-center gap-2 transition-all"
              >
                {isDeletingAccount ? (
                  <>
                    <div className="size-4 border-2 border-white border-t-transparent animate-spin rounded-full" />
                    <span>Deleting Account...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="size-4" />
                    <span>Permanently Delete Account</span>
                  </>
                )}
              </Button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}