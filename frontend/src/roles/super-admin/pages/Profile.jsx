import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { PageHeader, Panel, Notice, Tag } from "@/components/hs/kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { User, Shield, Lock, LogOut, Mail, Phone, Edit3, Eye, EyeOff, Camera } from "lucide-react";
import { authService } from "@/services/auth";
import { validateWithZod, staffSchema, changePasswordSchema } from "@/schemas";

function SuperAdminProfile() {
  const currentUser = authService.getCurrentUser() || {
    name: "Nandini Rao Rao",
    email: "superadmin@hourstay.com",
    phone: "9999999999",
    role: "Super Admin",
    status: "Active"
  };

  const [isEditing, setIsEditing] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [profileErrors, setProfileErrors] = useState({});
  const [passwordErrors, setPasswordErrors] = useState({});
  const [profileData, setProfileData] = useState({
    name: currentUser.name || "Nandini Rao Rao",
    email: currentUser.email || "superadmin@hourstay.com",
    phone: currentUser.mobile || currentUser.phone || "9999999999",
    role: currentUser.role === "super-admin" ? "Super Admin" : (currentUser.role || "Super Admin"),
    status: currentUser.status || "Active",
    avatar: currentUser.avatar || null
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

  useEffect(() => {
    authService.getProfile()
      .then((res) => {
        if (res.success && res.data) {
          const fresh = res.data;
          setProfileData({
            name: fresh.name || "",
            email: fresh.email || "",
            phone: fresh.mobile || fresh.phone || "",
            role: fresh.role === "super-admin" ? "Super Admin" : fresh.role,
            status: fresh.status || "Active",
            avatar: fresh.avatar || null
          });
        }
      })
      .catch(() => {});
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
      const formData = new FormData();
      formData.append("avatar", file);

      const res = await authService.updateProfile(formData);
      if (res.success && res.data) {
        setProfileData(prev => ({
          ...prev,
          avatar: res.data.avatar || null
        }));
        setNotification({
          tone: "success",
          title: "Avatar Updated",
          body: "Your profile picture has been updated successfully."
        });
      }
    } catch (err) {
      setNotification({
        tone: "error",
        title: "Upload Failed",
        body: err.message || "Could not upload profile picture."
      });
    }
    setTimeout(() => setNotification(null), 4000);
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    const validation = validateWithZod(staffSchema, {
      name: profileData.name,
      email: profileData.email,
      phone: profileData.phone
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
    setIsEditing(false);
    
    try {
      const formData = new FormData();
      formData.append("name", profileData.name);
      formData.append("mobile", profileData.phone);

      const res = await authService.updateProfile(formData);
      if (res.success && res.data) {
        setProfileData(prev => ({
          ...prev,
          name: res.data.name,
          phone: res.data.mobile || res.data.phone || "",
          avatar: res.data.avatar || null
        }));
        setNotification({
          tone: "success",
          title: "Profile Updated",
          body: "Your personal details have been saved successfully."
        });
      }
    } catch (err) {
      setNotification({
        tone: "error",
        title: "Update Failed",
        body: err.message || "Could not update profile details."
      });
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
      const res = await authService.changePassword(passwordData.currentPassword, passwordData.newPassword);
      if (res.success) {
        setIsChangingPassword(false);
        setPasswordData({ currentPassword: "", newPassword: "", confirmNewPassword: "" });
        setNotification({
          tone: "success",
          title: "Password Changed",
          body: "Security credentials updated successfully."
        });
      }
    } catch (err) {
      setNotification({
        tone: "error",
        title: "Change Password Failed",
        body: err.message || "Failed to update your credentials."
      });
    }
    setTimeout(() => setNotification(null), 4000);
  };

  const handleLogout = () => {
    authService.logout();
    window.location.href = "/login";
  };

  const initials = profileData.name
    ? profileData.name.split(" ").map(n => n[0]).join("").toUpperCase().substring(0, 2)
    : "NR";

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
            <div className="relative group">
              <Avatar className="size-24 border-[3px] border-purple/10">
                <AvatarImage src={profileData.avatar || ""} alt={profileData.name} className="object-cover" />
                <AvatarFallback className="bg-navy text-2xl font-bold text-cream select-none">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <label
                htmlFor="avatar-upload"
                className="absolute bottom-0 right-0 bg-gold hover:bg-gold/90 text-navy rounded-full p-2 cursor-pointer shadow-md transition-all hover:scale-105 flex items-center justify-center border-2 border-white size-8"
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
                      nameOnly
                      value={profileData.name}
                      onChange={(e) => {
                        setProfileData({ ...profileData, name: e.target.value });
                        if (profileErrors.name) setProfileErrors({ ...profileErrors, name: undefined });
                      }}
                      className={`h-10 text-xs border ${profileErrors.name ? "border-rose-500" : "border-muted"} font-semibold text-navy bg-cream/10`}
                    />
                    {profileErrors.name && (
                      <p className="text-[11px] font-bold text-rose-600 mt-1">{profileErrors.name}</p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="edit-phone" className="text-navy font-semibold text-xs">Mobile Number</Label>
                    <Input
                      id="edit-phone"
                      type="tel"
                      value={profileData.phone}
                      onChange={(e) => {
                        setProfileData({ ...profileData, phone: e.target.value });
                        if (profileErrors.phone) setProfileErrors({ ...profileErrors, phone: undefined });
                      }}
                      className={`h-10 text-xs border ${profileErrors.phone ? "border-rose-500" : "border-muted"} font-semibold text-navy bg-cream/10`}
                    />
                    {profileErrors.phone && (
                      <p className="text-[11px] font-bold text-rose-600 mt-1">{profileErrors.phone}</p>
                    )}
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
                      onChange={(e) => {
                        setPasswordData({ ...passwordData, currentPassword: e.target.value });
                        if (passwordErrors.currentPassword) setPasswordErrors({ ...passwordErrors, currentPassword: undefined });
                      }}
                      className={`h-10 text-xs border ${passwordErrors.currentPassword ? "border-rose-500" : "border-muted"} font-semibold text-navy bg-cream/10 pr-10`}
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
                  {passwordErrors.currentPassword && (
                    <p className="text-[11px] font-bold text-rose-600 mt-1">{passwordErrors.currentPassword}</p>
                  )}
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="new-pw" className="text-navy font-semibold text-xs">New Password</Label>
                    <div className="relative">
                      <Input
                        id="new-pw"
                        type={showPass.new ? "text" : "password"}
                        value={passwordData.newPassword}
                        onChange={(e) => {
                          setPasswordData({ ...passwordData, newPassword: e.target.value });
                          if (passwordErrors.newPassword) setPasswordErrors({ ...passwordErrors, newPassword: undefined });
                        }}
                        className={`h-10 text-xs border ${passwordErrors.newPassword ? "border-rose-500" : "border-muted"} font-semibold text-navy bg-cream/10 pr-10`}
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
                    {passwordErrors.newPassword && (
                      <p className="text-[11px] font-bold text-rose-600 mt-1">{passwordErrors.newPassword}</p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="confirm-new-pw" className="text-navy font-semibold text-xs">Confirm New Password</Label>
                    <div className="relative">
                      <Input
                        id="confirm-new-pw"
                        type={showPass.confirm ? "text" : "password"}
                        value={passwordData.confirmNewPassword}
                        onChange={(e) => {
                          setPasswordData({ ...passwordData, confirmNewPassword: e.target.value });
                          if (passwordErrors.confirmPassword) setPasswordErrors({ ...passwordErrors, confirmPassword: undefined });
                        }}
                        className={`h-10 text-xs border ${passwordErrors.confirmPassword ? "border-rose-500" : "border-muted"} font-semibold text-navy bg-cream/10 pr-10`}
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
                    {passwordErrors.confirmPassword && (
                      <p className="text-[11px] font-bold text-rose-600 mt-1">{passwordErrors.confirmPassword}</p>
                    )}
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
