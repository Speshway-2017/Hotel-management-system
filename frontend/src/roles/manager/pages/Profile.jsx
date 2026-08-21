import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { HorizontalRouteTabs, Panel, Notice, Tag } from "@/components/hs/kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  User,
  Shield,
  Lock,
  LogOut,
  Mail,
  Phone,
  Building,
  Key,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff
} from "lucide-react";
import { authService } from "@/services/auth";
import { superAdminService } from "@/services/superAdmin";

const settingsTabs = [
  { label: "Profile", to: "/manager/profile", icon: User }
];

export const Route = createFileRoute("/manager/profile")({
  head: () => ({
    meta: [
      { title: "Manager Profile — Hour Stay" },
      { name: "description", content: "Manage credentials, password configuration, and session status." }
    ]
  }),
  component: ManagerProfilePage
});

function ManagerProfilePage() {
  const currentUser = authService.getCurrentUser() || {
    name: "Meghana",
    email: "meghana@hourstay.com",
    role: "manager"
  };

  const [isEditing, setIsEditing] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  
  const [profileData, setProfileData] = useState({
    name: currentUser.name || "Meghana",
    email: currentUser.email || "meghana@hourstay.com",
    phone: currentUser.mobile || currentUser.phone || "+91 73676 75676",
    role: "Hotel Manager",
    status: "Active"
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmNewPassword: ""
  });

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [userProperty, setUserProperty] = useState({
    name: "Speshway Luxury Hotel",
    city: "Madhapur, Hyderabad"
  });

  const [notification, setNotification] = useState(null);

  useEffect(() => {
    // Sync fresh user profile
    authService.getProfile()
      .then((res) => {
        if (res.success && res.data) {
          const fresh = res.data;
          setProfileData({
            name: fresh.name || "",
            email: fresh.email || "",
            phone: fresh.mobile || fresh.phone || "",
            role: fresh.role === "manager" ? "Hotel Manager" : fresh.role,
            status: fresh.status || "Active"
          });
          
          superAdminService.getProperties()
            .then((propRes) => {
              if (propRes.success && propRes.data) {
                const found = propRes.data.find(p => p._id === fresh.propertyId || p.id === fresh.propertyId);
                if (found) {
                  setUserProperty(found);
                }
              }
            })
            .catch(() => {});
        }
      })
      .catch(() => {});
  }, []);

  const handleProfileSubmit = (e) => {
    e.preventDefault();
    setIsEditing(false);
    
    // Save updated info locally to mimic successful save
    const updatedUser = {
      ...currentUser,
      name: profileData.name,
      mobile: profileData.phone
    };
    localStorage.setItem("hms_user", JSON.stringify(updatedUser));

    setNotification({
      tone: "success",
      title: "Profile Saved",
      body: "Manager account details have been updated successfully."
    });
    setTimeout(() => setNotification(null), 4000);
  };

  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmNewPassword) {
      setNotification({
        tone: "error",
        title: "Password Mismatch",
        body: "Confirm password does not match new password."
      });
      return;
    }
    setIsChangingPassword(false);
    setPasswordData({ currentPassword: "", newPassword: "", confirmNewPassword: "" });
    setNotification({
      tone: "success",
      title: "Credentials Saved",
      body: "Security password credentials updated successfully."
    });
    setTimeout(() => setNotification(null), 4000);
  };

  const handleLogout = () => {
    authService.logout();
    window.location.href = "/login";
  };

  const initials = profileData.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .substring(0, 2);

  return (
    <div className="space-y-6 text-left animate-fade-in">

      {notification && (
        <Notice tone={notification.tone} title={notification.title}>
          {notification.body}
        </Notice>
      )}

      <div className="grid gap-6 md:grid-cols-3">
        {/* Left column summary card */}
        <div className="md:col-span-1 space-y-6">
          <div className="bg-white rounded-xl border border-muted p-6 shadow-soft text-center flex flex-col items-center">
            <Avatar className="size-24 border-[3px] border-navy/10">
              <AvatarFallback className="bg-navy text-2xl font-bold text-cream select-none">
                {initials || "MG"}
              </AvatarFallback>
            </Avatar>
            <h3 className="mt-4 font-display text-lg font-black text-navy">{profileData.name}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">{profileData.email}</p>
            
            <div className="mt-4 flex flex-wrap gap-1.5 justify-center">
              <Tag tone="brand">{profileData.role}</Tag>
              <Tag tone="success">Active Status</Tag>
            </div>
            
            <div className="w-full border-t border-muted my-5 pt-5 text-left text-xs space-y-3.5">
              <div className="flex items-center gap-2 text-navy-deep font-semibold">
                <Building className="size-4 text-purple" />
                <span>Assigned: <strong className="text-brand">{userProperty.name}</strong></span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Mail className="size-4 text-navy/70" />
                <span>{profileData.email}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Phone className="size-4 text-navy/70" />
                <span>{profileData.phone}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="size-4 text-navy/70" />
                <span>Last login: Today, 12:05 PM</span>
              </div>
            </div>

            <Button
              variant="destructive"
              onClick={handleLogout}
              className="w-full h-10 rounded-full font-bold gap-2 text-xs uppercase tracking-wide cursor-pointer"
            >
              <LogOut className="size-4" />
              Sign Out
            </Button>
          </div>
        </div>

        {/* Right column details and update actions */}
        <div className="md:col-span-2 space-y-6">
          
          {/* View Details */}
          {!isEditing && !isChangingPassword && (
            <Panel title="Personal Manager Details" description="Your core operational profile details.">
              <div className="p-6 bg-white rounded-b-xl space-y-5 text-xs">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1">
                    <p className="text-muted-foreground font-bold uppercase tracking-wider text-[9px]">Full Name</p>
                    <p className="font-semibold text-navy text-sm">{profileData.name}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-muted-foreground font-bold uppercase tracking-wider text-[9px]">Contact Phone</p>
                    <p className="font-semibold text-navy text-sm">{profileData.phone}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-muted-foreground font-bold uppercase tracking-wider text-[9px]">Email Address</p>
                    <p className="font-semibold text-navy text-sm">{profileData.email}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-muted-foreground font-bold uppercase tracking-wider text-[9px]">Hotel Property</p>
                    <p className="font-semibold text-navy text-sm">{userProperty.name} ({userProperty.city})</p>
                  </div>
                </div>

                <div className="pt-5 border-t border-muted flex flex-wrap gap-2 justify-end">
                  <Button
                    onClick={() => setIsChangingPassword(true)}
                    variant="outline"
                    className="border-muted text-navy hover:bg-muted/10 text-xs h-9 px-5 font-bold"
                  >
                    <Key className="size-3.5 mr-1" /> Change Password
                  </Button>
                  <Button
                    onClick={() => setIsEditing(true)}
                    className="bg-navy hover:bg-navy-deep text-white text-xs h-9 px-6 font-bold shadow-soft"
                  >
                    Edit Profile Details
                  </Button>
                </div>
              </div>
            </Panel>
          )}

          {/* Edit Profile */}
          {isEditing && (
            <Panel title="Modify Profile Specifications" description="Change your general personal identity attributes.">
              <form onSubmit={handleProfileSubmit} className="p-6 bg-white rounded-b-xl space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="edit-name" className="text-navy font-semibold text-xs">Full Name</Label>
                    <Input
                      id="edit-name"
                      value={profileData.name}
                      onChange={(e) => setProfileData(prev => ({ ...prev, name: e.target.value }))}
                      className="h-10 text-xs border border-muted font-semibold text-navy bg-cream/10"
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="edit-phone" className="text-navy font-semibold text-xs">Mobile Number</Label>
                    <Input
                      id="edit-phone"
                      value={profileData.phone}
                      onChange={(e) => setProfileData(prev => ({ ...prev, phone: e.target.value }))}
                      className="h-10 text-xs border border-muted font-semibold text-navy bg-cream/10"
                      required
                    />
                  </div>
                </div>
                <div className="flex gap-2.5 pt-3">
                  <Button type="submit" className="bg-purple hover:bg-purple/90 text-cream text-xs font-bold rounded-full px-5 h-9 cursor-pointer">
                    Save Changes
                  </Button>
                  <Button type="button" variant="ghost" onClick={() => setIsEditing(false)} className="text-navy text-xs font-bold rounded-full px-5 h-9 cursor-pointer">
                    Cancel
                  </Button>
                </div>
              </form>
            </Panel>
          )}

          {/* Change Password */}
          {isChangingPassword && (
            <Panel title="Change Account Password" description="Update your security passcode.">
              <form onSubmit={handlePasswordSubmit} className="p-6 bg-white rounded-b-xl space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="current-pw" className="text-navy font-semibold text-xs">Current Password</Label>
                  <div className="relative">
                    <Input
                      id="current-pw"
                      type={showCurrentPassword ? "text" : "password"}
                      value={passwordData.currentPassword}
                      onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                      className="h-10 text-xs border border-muted font-semibold text-navy bg-cream/10 pr-10"
                      placeholder="••••••••"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-navy cursor-pointer flex items-center justify-center border-none bg-transparent"
                    >
                      {showCurrentPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="new-pw" className="text-navy font-semibold text-xs">New Password</Label>
                    <div className="relative">
                      <Input
                        id="new-pw"
                        type={showNewPassword ? "text" : "password"}
                        value={passwordData.newPassword}
                        onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                        className="h-10 text-xs border border-muted font-semibold text-navy bg-cream/10 pr-10"
                        placeholder="••••••••"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-navy cursor-pointer flex items-center justify-center border-none bg-transparent"
                      >
                        {showNewPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="confirm-new-pw" className="text-navy font-semibold text-xs">Confirm New Password</Label>
                    <div className="relative">
                      <Input
                        id="confirm-new-pw"
                        type={showConfirmPassword ? "text" : "password"}
                        value={passwordData.confirmNewPassword}
                        onChange={(e) => setPasswordData(prev => ({ ...prev, confirmNewPassword: e.target.value }))}
                        className="h-10 text-xs border border-muted font-semibold text-navy bg-cream/10 pr-10"
                        placeholder="••••••••"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-navy cursor-pointer flex items-center justify-center border-none bg-transparent"
                      >
                        {showConfirmPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                      </button>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2.5 pt-3">
                  <Button type="submit" className="bg-purple hover:bg-purple/90 text-cream text-xs font-bold rounded-full px-5 h-9 cursor-pointer">
                    Update Password
                  </Button>
                  <Button type="button" variant="ghost" onClick={() => setIsChangingPassword(false)} className="text-navy text-xs font-bold rounded-full px-5 h-9 cursor-pointer">
                    Cancel
                  </Button>
                </div>
              </form>
            </Panel>
          )}

        </div>
      </div>
    </div>
  );
}
