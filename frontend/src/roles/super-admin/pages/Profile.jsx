import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader, Panel, Notice, Tag } from "@/components/hs/kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { User, Shield, Lock, LogOut, Mail, Phone, Edit3, Eye, EyeOff } from "lucide-react";
import { authService } from "@/services/auth";

function SuperAdminProfile() {
  const [isEditing, setIsEditing] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [profileData, setProfileData] = useState({
    name: "Nandini Rao",
    email: "superadmin@hourstay.com",
    phone: "9999999999",
    role: "Super Admin",
    status: "Active"
  });
  
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmNewPassword: ""
  });
  
  const [showPass, setShowPass] = useState({
    current: false,
    new: false,
    confirm: false
  });
  
  const [notification, setNotification] = useState(null);

  const handleProfileSubmit = (e) => {
    e.preventDefault();
    setIsEditing(false);
    setNotification({
      tone: "success",
      title: "Profile Updated",
      body: "Your personal details have been saved successfully."
    });
    setTimeout(() => setNotification(null), 4000);
  };

  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmNewPassword) {
      setNotification({
        tone: "error",
        title: "Password Mismatch",
        body: "New passwords do not match."
      });
      return;
    }
    setIsChangingPassword(false);
    setPasswordData({ currentPassword: "", newPassword: "", confirmNewPassword: "" });
    setNotification({
      tone: "success",
      title: "Password Changed",
      body: "Security credentials updated successfully."
    });
    setTimeout(() => setNotification(null), 4000);
  };

  const handleLogout = () => {
    authService.logout();
    window.location.href = "/login";
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Super Admin Profile"
        subtitle="Manage your credentials, security settings, and session status."
      />

      {notification && (
        <Notice tone={notification.tone} title={notification.title}>
          {notification.body}
        </Notice>
      )}

      <div className="grid gap-6 md:grid-cols-3">
        {/* Left Side: Avatar & Summary Card */}
        <div className="md:col-span-1 space-y-6">
          <div className="bg-white rounded-xl border border-muted p-6 shadow-soft text-center flex flex-col items-center">
            <Avatar className="size-24 border-[3px] border-purple/10">
              <AvatarFallback className="bg-navy text-2xl font-bold text-cream">
                NR
              </AvatarFallback>
            </Avatar>
            <h3 className="mt-4 font-display text-lg font-black text-navy">{profileData.name}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">{profileData.email}</p>
            
            <div className="mt-4 flex items-center gap-1.5 justify-center">
              <Tag tone="success">{profileData.role}</Tag>
              <Tag tone="brand">Group Root Access</Tag>
            </div>
            
            <div className="w-full border-t border-muted my-5 pt-5 text-left text-xs space-y-3.5">
              <div className="flex items-center gap-2 text-navy-deep font-semibold">
                <Shield className="size-4 text-purple" />
                <span>Account Status: Active</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Mail className="size-4" />
                <span>{profileData.email}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Phone className="size-4" />
                <span>{profileData.phone}</span>
              </div>
            </div>

            <Button
              variant="destructive"
              onClick={handleLogout}
              className="w-full h-10 rounded-full font-bold gap-2 text-xs uppercase tracking-wide cursor-pointer animate-fade-in"
            >
              <LogOut className="size-4" />
              Sign Out
            </Button>
          </div>
        </div>

        {/* Right Side: Tab Cards / Modifiable Form Panels */}
        <div className="md:col-span-2 space-y-6">
          {/* Details Card */}
          {!isEditing && !isChangingPassword && (
            <Panel title="Personal Details" description="Your core contact information on Hour Stay.">
              <div className="p-6 bg-white rounded-b-xl space-y-5 text-xs">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1">
                    <p className="text-muted-foreground font-bold uppercase tracking-wider text-[9px]">Full Name</p>
                    <p className="font-semibold text-navy text-sm">{profileData.name}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-muted-foreground font-bold uppercase tracking-wider text-[9px]">Mobile Number</p>
                    <p className="font-semibold text-navy text-sm">{profileData.phone}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-muted-foreground font-bold uppercase tracking-wider text-[9px]">Email Address</p>
                    <p className="font-semibold text-navy text-sm">{profileData.email}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-muted-foreground font-bold uppercase tracking-wider text-[9px]">Role Group</p>
                    <p className="font-semibold text-navy text-sm">{profileData.role}</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3.5 pt-4 border-t border-muted">
                  <Button
                    onClick={() => setIsEditing(true)}
                    className="bg-navy hover:bg-navy/95 text-cream text-xs font-bold rounded-full py-2.5 px-5 h-9 cursor-pointer gap-1.5"
                  >
                    <Edit3 className="size-3.5" />
                    Edit Profile
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setIsChangingPassword(true)}
                    className="border-muted hover:bg-muted text-navy-deep text-xs font-bold rounded-full py-2.5 px-5 h-9 cursor-pointer gap-1.5"
                  >
                    <Lock className="size-3.5" />
                    Change Password
                  </Button>
                </div>
              </div>
            </Panel>
          )}

          {/* Edit Form Panel */}
          {isEditing && (
            <Panel title="Edit Profile Details" description="Modify your core account profile credentials.">
              <form onSubmit={handleProfileSubmit} className="p-6 bg-white rounded-b-xl space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="edit-name" className="text-navy font-semibold text-xs">Full Name</Label>
                    <Input
                      id="edit-name"
                      value={profileData.name}
                      onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                      className="h-10 text-xs border border-muted font-semibold text-navy bg-cream/10"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="edit-phone" className="text-navy font-semibold text-xs">Mobile Number</Label>
                    <Input
                      id="edit-phone"
                      value={profileData.phone}
                      onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                      className="h-10 text-xs border border-muted font-semibold text-navy bg-cream/10"
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

          {/* Change Password Form Panel */}
          {isChangingPassword && (
            <Panel title="Change Account Password" description="Update your security passcode.">
              <form onSubmit={handlePasswordSubmit} className="p-6 bg-white rounded-b-xl space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="current-pw" className="text-navy font-semibold text-xs">Current Password</Label>
                  <div className="relative">
                    <Input
                      id="current-pw"
                      type={showPass.current ? "text" : "password"}
                      value={passwordData.currentPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                      className="h-10 text-xs border border-muted font-semibold text-navy bg-cream/10 pr-10"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass(prev => ({ ...prev, current: !prev.current }))}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-navy cursor-pointer flex items-center justify-center"
                    >
                      {showPass.current ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="new-pw" className="text-navy font-semibold text-xs">New Password</Label>
                    <div className="relative">
                      <Input
                        id="new-pw"
                        type={showPass.new ? "text" : "password"}
                        value={passwordData.newPassword}
                        onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                        className="h-10 text-xs border border-muted font-semibold text-navy bg-cream/10 pr-10"
                        placeholder="••••••••"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPass(prev => ({ ...prev, new: !prev.new }))}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-navy cursor-pointer flex items-center justify-center"
                      >
                        {showPass.new ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="confirm-new-pw" className="text-navy font-semibold text-xs">Confirm New Password</Label>
                    <div className="relative">
                      <Input
                        id="confirm-new-pw"
                        type={showPass.confirm ? "text" : "password"}
                        value={passwordData.confirmNewPassword}
                        onChange={(e) => setPasswordData({ ...passwordData, confirmNewPassword: e.target.value })}
                        className="h-10 text-xs border border-muted font-semibold text-navy bg-cream/10 pr-10"
                        placeholder="••••••••"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPass(prev => ({ ...prev, confirm: !prev.confirm }))}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-navy cursor-pointer flex items-center justify-center"
                      >
                        {showPass.confirm ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
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

export const Route = createFileRoute("/super-admin/profile")({
  head: () => ({
    meta: [
      { title: "Profile — Hour Stay" },
      { name: "description", content: "Super Admin details and security settings." },
      { property: "og:title", content: "Profile — Hour Stay" },
      { property: "og:description", content: "Super Admin details and security settings." }
    ]
  }),
  component: SuperAdminProfile
});
