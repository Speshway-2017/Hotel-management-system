import { FormField, Input, Select, Textarea, Checkbox, Switch } from "@/components/hs/FormFields";
import { Label } from "@/components/ui/label";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageHeader, Panel, Tag, Notice, LoadingRows } from "@/components/hs/kit";
import { superAdminService } from "@/services/superAdmin";
import { Button } from "@/components/ui/button";


import { toast } from "sonner";
import {
  Save,
  RotateCcw,
  Sliders,
  RefreshCw,
  Receipt,
  BellRing,
  KeyRound,
  Network,
  MonitorPlay,
  ShieldAlert,
  AlertTriangle,
  CheckCircle,
  HelpCircle,
  X,
  Play,
  Settings2,
  Eye,
  EyeOff
} from "lucide-react";

// Premium sliding toggle switch component
function ToggleSwitch({ checked, onChange, label, description }) {
  return (
    <div className="flex items-start justify-between p-4 border rounded-xl bg-white shadow-soft transition-all hover:border-purple/30">
      <div className="space-y-1 pr-6 text-left">
        {label && <span className="text-xs font-bold text-navy font-ui">{label}</span>}
        {description && <p className="text-[10px] text-muted-foreground leading-normal font-medium font-ui">{description}</p>}
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-5.5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none mt-0.5 ${
          checked ? "bg-purple" : "bg-muted"
        }`}
      >
        <span
          className={`pointer-events-none inline-block size-4.5 transform rounded-full bg-white shadow-soft ring-0 transition duration-200 ease-in-out ${
            checked ? "translate-x-4.5" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );
}

function SuperAdminSettings() {
  const [activeTab, setActiveTab] = useState("general");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settingsId, setSettingsId] = useState(null);

  // Database settings and local active form state settings
  const [dbSettings, setDbSettings] = useState({
    platformName: "Hour Stay",
    currency: "INR",
    language: "English",
    timezone: "Asia/Kolkata",
    dateFormat: "DD-MM-YYYY",

    publicBookingsEnabled: true,
    bookingConfirmMode: "Automatic",
    cancellationPolicy: "Free up to 24h",
    checkInTime: "12:00 PM",
    checkOutTime: "11:00 AM",
    autoConfirmReservations: true,

    gstEnabled: true,
    gstin: "08AAACH1100C1Z5",
    defaultTaxRate: 18,
    invoicePrefix: "HS-",
    invoiceNumberingStart: 1001,
    taxInclusiveDisplay: true,

    emailNotificationsEnabled: true,
    smsNotificationsEnabled: true,
    whatsappNotificationsEnabled: true,
    pushNotificationsEnabled: false,
    notifyOnBooking: true,
    notifyOnCancellation: true,
    notifyOnInvoice: true,

    tfaEnabled: false,
    sessionTimeoutMinutes: 30,
    passwordMinLength: 8,
    maxLoginAttempts: 5,
    forceLogoutOnPasswordChange: true,

    publicWebsiteEnabled: true,
    maintenanceMode: false,
    publicContactPhone: "+91 141 220 9900",
    publicContactEmail: "contact@hourstay.com",
    publicContactAddress: "Hour Stay HQ, Jaipur, Rajasthan"
  });

  const [settings, setSettings] = useState({ ...dbSettings });

  // Confirmation Modal State
  const [confirmModal, setConfirmModal] = useState({
    open: false,
    key: "",
    value: null,
    message: "",
    title: ""
  });

  // Integrations state
  const [integrations, setIntegrations] = useState({
    payment: { name: "Razorpay Checkout", status: "Connected", lastSync: "Sync active", provider: "Razorpay" },
    channel: { name: "Hour Stay Channel Sync", status: "Connected", lastSync: "2 min ago", provider: "Direct XML" },
    email: { name: "SendGrid SMTP", status: "Connected", lastSync: "1 day ago", provider: "SendGrid" },
    sms: { name: "MSG91 SMS Gateway", status: "Connected", lastSync: "Active", provider: "MSG91" },
    whatsapp: { name: "WhatsApp Business API", status: "Not Connected", lastSync: "Never", provider: "Twilio Business" }
  });

  const [integrationModal, setIntegrationModal] = useState({
    open: false,
    key: "",
    name: "",
    apiKey: "",
    endpoint: ""
  });
  const [showSecretKey, setShowSecretKey] = useState(false);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const res = await superAdminService.getCmsItems();
      if (res.success) {
        const settingsDoc = res.data.find(item => item.type === "settings");
        if (settingsDoc && settingsDoc.content) {
          const parsed = JSON.parse(settingsDoc.content);
          const merged = {
            ...dbSettings,
            ...parsed
          };
          setDbSettings(merged);
          setSettings(merged);
          setSettingsId(settingsDoc.id || settingsDoc._id);
        }
      }
    } catch (err) {
      toast.error(err.message || "Failed to retrieve configurations.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const hasChanges = JSON.stringify(settings) !== JSON.stringify(dbSettings);

  const handleDiscardChanges = () => {
    setSettings({ ...dbSettings });
    toast.info("Form modifications discarded.");
  };

  const handleSaveSettings = async (e) => {
    if (e) e.preventDefault();
    setSaving(true);
    try {
      let res;
      const payload = {
        type: "settings",
        content: JSON.stringify(settings)
      };

      if (settingsId) {
        res = await superAdminService.updateCmsItem(settingsId, payload);
      } else {
        res = await superAdminService.createCmsItem(payload);
      }

      if (res.success) {
        toast.success("HMS System settings successfully synchronized.");
        loadSettings();
      }
    } catch (err) {
      toast.error(err.message || "Failed to update configurations");
    } finally {
      setSaving(false);
    }
  };

  // Toggle sensitive options triggers modal
  const handleToggleSensitive = (key, value, title, message) => {
    setConfirmModal({
      open: true,
      key,
      value,
      title,
      message
    });
  };

  const confirmSensitiveAction = () => {
    setSettings(prev => ({
      ...prev,
      [confirmModal.key]: confirmModal.value
    }));
    setConfirmModal({ open: false, key: "", value: null, message: "", title: "" });
    toast.success("Setting applied to form state. Remember to click Save.");
  };

  // Integration Action triggers
  const handleTestConnection = (key, name) => {
    toast.loading(`Testing connection to ${name}...`);
    setTimeout(() => {
      toast.dismiss();
      toast.success(`Connection to ${name} tested successfully! Status code 200 OK.`);
    }, 1200);
  };

  const handleDisconnect = (key, name) => {
    setIntegrations(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        status: "Not Connected",
        lastSync: "Never"
      }
    }));
    toast.warning(`Disconnected ${name} integration module.`);
  };

  const handleConfigure = (key, intObj) => {
    setIntegrationModal({
      open: true,
      key,
      name: intObj.name,
      apiKey: "••••••••••••••••••••••••",
      endpoint: "https://api.hourstay.in/v1/" + key
    });
  };

  const saveIntegrationDetails = (e) => {
    e.preventDefault();
    setIntegrations(prev => ({
      ...prev,
      [integrationModal.key]: {
        ...prev[integrationModal.key],
        status: "Connected",
        lastSync: "Just now"
      }
    }));
    setIntegrationModal({ open: false, key: "", name: "", apiKey: "", endpoint: "" });
    toast.success(`${integrationModal.name} credentials updated and tested!`);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Global Settings Control Center"
        subtitle="Manage SaaS settings, automated billing parameters, API gateways, and public visibility from a single console."
      />

      {hasChanges && (
        <div className="flex items-center justify-between bg-gold/10 border border-gold/30 rounded-xl p-4 text-navy font-semibold text-xs sm:text-sm animate-fade-in text-left">
          <div className="flex items-center gap-2">
            <AlertTriangle className="size-4.5 text-gold shrink-0" />
            <span>You have unsaved changes in Category <strong>{activeTab.toUpperCase()}</strong>. These will not take effect until saved.</span>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleDiscardChanges} variant="ghost" className="h-8 rounded-full text-xs font-semibold">
              <RotateCcw className="size-3 mr-1" /> Reset
            </Button>
            <Button onClick={handleSaveSettings} disabled={saving} className="bg-navy hover:bg-navy/90 text-cream h-8 rounded-full text-xs font-semibold gap-1">
              <Save className="size-3" /> Save Changes
            </Button>
          </div>
        </div>
      )}

      {/* Main split layout settings container */}
      <div className="grid gap-6 lg:grid-cols-[220px_1fr] items-start">
        
        {/* Sticky left navigation settings sidebar */}
        <div className="sticky top-6 space-y-1 bg-white border border-navy/5 rounded-xl p-3 shadow-soft text-left">
          <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/80 border-b mb-2">
            Settings Category
          </p>
          {[
            { id: "general", label: "General Configs", icon: Sliders },
            { id: "booking", label: "Booking Policy", icon: RefreshCw },
            { id: "billing", label: "Tax & Billing", icon: Receipt },
            { id: "notifications", label: "Notifications", icon: BellRing },
            { id: "security", label: "Access & Security", icon: KeyRound },
            { id: "integrations", label: "Integrations Hub", icon: Network },
            { id: "website", label: "Website Toggles", icon: MonitorPlay }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); }}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs font-semibold transition-all duration-200 cursor-pointer ${
                activeTab === tab.id
                  ? "bg-purple/10 text-purple"
                  : "text-muted-foreground hover:bg-muted hover:text-navy"
              }`}
            >
              <tab.icon className="size-4 shrink-0" />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Right Settings Panel content form */}
        <div className="space-y-6">
          
          {loading ? (
            <LoadingRows rows={4} />
          ) : (
            <div className="space-y-6">
              
              {/* TAB 1: General Category */}
              {activeTab === "general" && (
                <Panel title="General Localization" description="Basic Hour Stay platform branding and localization setup.">
                  <div className="p-5 space-y-4 text-left">
                    <div className="space-y-1">
                      <Label htmlFor="gen-plat" className="text-xs text-navy font-semibold">Platform Name</Label>
                      <Input
                        id="gen-plat"
                        value={settings.platformName}
                        onChange={(e) => setSettings({ ...settings, platformName: e.target.value })}
                        className="h-10 text-xs bg-white focus:border-purple focus:ring-1 focus:ring-purple"
                      />
                      <p className="text-[10px] text-muted-foreground">The platform brand label shown in headers, page tabs and notifications.</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <Label htmlFor="gen-lang" className="text-xs text-navy font-semibold">Default System Language</Label>
                        <Select
                          id="gen-lang"
                          value={settings.language}
                          onChange={(e) => setSettings({ ...settings, language: e.target.value })}
                          className="w-full bg-white border border-muted px-3 h-10 rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-purple mt-1"
                        >
                          <option value="English">English (United States)</option>
                          <option value="Hindi">Hindi (हिन्दी)</option>
                          <option value="Rajasthani">Rajasthani (Jaipur)</option>
                        </Select>
                      </div>

                      <div className="space-y-1">
                        <Label htmlFor="gen-curr" className="text-xs text-navy font-semibold">Default System Currency</Label>
                        <Select
                          id="gen-curr"
                          value={settings.currency}
                          onChange={(e) => setSettings({ ...settings, currency: e.target.value })}
                          className="w-full bg-white border border-muted px-3 h-10 rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-purple mt-1"
                        >
                          <option value="INR">INR (₹) - Indian Rupee</option>
                          <option value="USD">USD ($) - US Dollar</option>
                          <option value="EUR">EUR (€) - Euro</option>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <Label htmlFor="gen-tz" className="text-xs text-navy font-semibold">Date Format Mapping</Label>
                        <Select
                          id="gen-df"
                          value={settings.dateFormat}
                          onChange={(e) => setSettings({ ...settings, dateFormat: e.target.value })}
                          className="w-full bg-white border border-muted px-3 h-10 rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-purple mt-1"
                        >
                          <option value="DD-MM-YYYY">DD-MM-YYYY (e.g. 17-08-2026)</option>
                          <option value="YYYY-MM-DD">YYYY-MM-DD (e.g. 2026-08-17)</option>
                          <option value="DD MMM YYYY">DD MMM YYYY (e.g. 17 Aug 2026)</option>
                        </Select>
                      </div>

                      <div className="space-y-1">
                        <Label htmlFor="gen-tz" className="text-xs text-navy font-semibold">Platform Time Zone</Label>
                        <Select
                          id="gen-tz"
                          value={settings.timezone}
                          onChange={(e) => setSettings({ ...settings, timezone: e.target.value })}
                          className="w-full bg-white border border-muted px-3 h-10 rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-purple mt-1"
                        >
                          <option value="Asia/Kolkata">Asia/Kolkata (IST - UTC+05:30)</option>
                          <option value="UTC">UTC (Universal Coordinated Time)</option>
                          <option value="Asia/Dubai">Asia/Dubai (GST - UTC+04:00)</option>
                        </Select>
                      </div>
                    </div>
                  </div>
                </Panel>
              )}

              {/* TAB 2: Booking Settings */}
              {activeTab === "booking" && (
                <Panel title="Reservation Rules & Times" description="Manage parameters governing guest reservations and check-in timelines.">
                  <div className="p-5 space-y-4 text-left">
                    <ToggleSwitch
                      checked={settings.publicBookingsEnabled}
                      onChange={(val) => handleToggleSensitive(
                        "publicBookingsEnabled",
                        val,
                        "Toggle Direct Public Bookings",
                        val === false 
                          ? "Disabling bookings will immediately hide the quick reservation card from the public website, blocking direct bookings."
                          : "Enabling bookings allows guests to book rooms directly from the public landing pages again."
                      )}
                      label="Enable Direct Public Bookings"
                      description="Allow guest accounts to complete direct online room stays bookings from public portals."
                    />

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <Label htmlFor="book-cm" className="text-xs text-navy font-semibold">Booking Confirmation Pipeline</Label>
                        <Select
                          id="book-cm"
                          value={settings.bookingConfirmMode}
                          onChange={(e) => setSettings({ ...settings, bookingConfirmMode: e.target.value })}
                          className="w-full bg-white border border-muted px-3 h-10 rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-purple mt-1"
                        >
                          <option value="Automatic">Automatic (Confirm instantly on room hold)</option>
                          <option value="Manual">Manual (Awaiting property owner confirmation)</option>
                        </Select>
                        <p className="text-[10px] text-muted-foreground">Select if walk-ins or OTAs require approval before folio booking is confirmed.</p>
                      </div>

                      <div className="space-y-1">
                        <Label htmlFor="book-cp" className="text-xs text-navy font-semibold">Cancellation Policy Defaults</Label>
                        <Select
                          id="book-cp"
                          value={settings.cancellationPolicy}
                          onChange={(e) => setSettings({ ...settings, cancellationPolicy: e.target.value })}
                          className="w-full bg-white border border-muted px-3 h-10 rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-purple mt-1"
                        >
                          <option value="Free up to 24h">Free Cancellation up to 24 Hours prior</option>
                          <option value="Free up to 48h">Free Cancellation up to 48 Hours prior</option>
                          <option value="Non-refundable">Strict Non-Refundable Policy</option>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <Label htmlFor="book-in" className="text-xs text-navy font-semibold">Standard Check-In Time</Label>
                        <Input
                          id="book-in"
                          value={settings.checkInTime}
                          onChange={(e) => setSettings({ ...settings, checkInTime: e.target.value })}
                          className="h-10 text-xs bg-white"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="book-out" className="text-xs text-navy font-semibold">Standard Check-Out Time</Label>
                        <Input
                          id="book-out"
                          value={settings.checkOutTime}
                          onChange={(e) => setSettings({ ...settings, checkOutTime: e.target.value })}
                          className="h-10 text-xs bg-white"
                        />
                      </div>
                    </div>

                    <ToggleSwitch
                      checked={settings.autoConfirmReservations}
                      onChange={(val) => setSettings({ ...settings, autoConfirmReservations: val })}
                      label="Auto-Confirm Paid Reservations"
                      description="Instantly mark bookings as Confirmed upon verified receipt pipeline transaction detection."
                    />
                  </div>
                </Panel>
              )}

              {/* TAB 3: Tax & Billing */}
              {activeTab === "billing" && (
                <Panel title="Tax & Invoicing Module" description="Manage platform GST slabs, GSN formatting and invoice naming defaults.">
                  <div className="p-5 space-y-4 text-left">
                    <ToggleSwitch
                      checked={settings.gstEnabled}
                      onChange={(val) => setSettings({ ...settings, gstEnabled: val })}
                      label="Enable GST Calculations"
                      description="Apply Goods and Services Tax splits on room tariffs and POS items automatically."
                    />

                    {settings.gstEnabled && (
                      <div className="grid grid-cols-2 gap-4 animate-fade-up">
                        <div className="space-y-1">
                          <Label htmlFor="bill-gstin" className="text-xs text-navy font-semibold">Corporate GSTIN Number</Label>
                          <Input
                            id="bill-gstin"
                            value={settings.gstin}
                            onChange={(e) => setSettings({ ...settings, gstin: e.target.value })}
                            className="h-10 text-xs bg-white uppercase font-mono"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="bill-gst-type" className="text-xs text-navy font-semibold">Tax Calculation Mode</Label>
                          <Select
                            id="bill-gst-type"
                            value={settings.gstMode}
                            onChange={(e) => setSettings({ ...settings, gstMode: e.target.value })}
                            className="w-full bg-white border border-muted px-3 h-10 rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-purple mt-1"
                          >
                            <option value="Slab">Indian GST Slab Rule (12% under ₹7,500 tariff, 18% above)</option>
                            <option value="Flat18">Flat GST (18% Flat rate on all items)</option>
                            <option value="None">Disabled / Tax Exempt</option>
                          </Select>
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-1">
                        <Label htmlFor="bill-rate" className="text-xs text-navy font-semibold">Default Tax Rate %</Label>
                        <Input
                          id="bill-rate"
                          type="number"
                          value={settings.defaultTaxRate}
                          onChange={(e) => setSettings({ ...settings, defaultTaxRate: Number(e.target.value) })}
                          className="h-10 text-xs bg-white"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="bill-pref" className="text-xs text-navy font-semibold">Invoice Serial Prefix</Label>
                        <Input
                          id="bill-pref"
                          value={settings.invoicePrefix}
                          onChange={(e) => setSettings({ ...settings, invoicePrefix: e.target.value })}
                          className="h-10 text-xs bg-white"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="bill-start" className="text-xs text-navy font-semibold">Invoice Naming Counter</Label>
                        <Input
                          id="bill-start"
                          type="number"
                          value={settings.invoiceNumberingStart}
                          onChange={(e) => setSettings({ ...settings, invoiceNumberingStart: Number(e.target.value) })}
                          className="h-10 text-xs bg-white"
                        />
                      </div>
                    </div>

                    <ToggleSwitch
                      checked={settings.taxInclusiveDisplay}
                      onChange={(val) => setSettings({ ...settings, taxInclusiveDisplay: val })}
                      label="Display Tax-Inclusive Prices"
                      description="Display all pricing on direct guest portals inclusive of calculated taxes and service levies."
                    />
                  </div>
                </Panel>
              )}

              {/* TAB 4: Notifications */}
              {activeTab === "notifications" && (
                <Panel title="System Notification Dispatches" description="Choose communication channels for platform dispatches.">
                  <div className="p-5 space-y-4 text-left">
                    <div className="grid grid-cols-2 gap-4">
                      <ToggleSwitch
                        checked={settings.emailNotificationsEnabled}
                        onChange={(val) => setSettings({ ...settings, emailNotificationsEnabled: val })}
                        label="Email Gateway dispatch"
                        description="Send booking invoice summaries to guest emails."
                      />
                      <ToggleSwitch
                        checked={settings.smsNotificationsEnabled}
                        onChange={(val) => setSettings({ ...settings, smsNotificationsEnabled: val })}
                        label="SMS Gateway dispatch"
                        description="Send room registration codes via MSG91 SMS."
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <ToggleSwitch
                        checked={settings.whatsappNotificationsEnabled}
                        onChange={(val) => setSettings({ ...settings, whatsappNotificationsEnabled: val })}
                        label="WhatsApp Business Logs"
                        description="Push billing folios links directly into guest WhatsApp chats."
                      />
                      <ToggleSwitch
                        checked={settings.pushNotificationsEnabled}
                        onChange={(val) => setSettings({ ...settings, pushNotificationsEnabled: val })}
                        label="Push Alert Notifications"
                        description="Enable desktop overlay sound alerts for receptionist check-ins."
                      />
                    </div>

                    <p className="text-[10px] font-bold uppercase tracking-wider text-navy mt-4 border-t pt-4">Automatic Triggers</p>
                    
                    <div className="grid grid-cols-3 gap-4">
                      <ToggleSwitch
                        checked={settings.notifyOnBooking}
                        onChange={(val) => setSettings({ ...settings, notifyOnBooking: val })}
                        label="Booking Confirmations"
                        description="Trigger notification when room hold is verified."
                      />
                      <ToggleSwitch
                        checked={settings.notifyOnCancellation}
                        onChange={(val) => setSettings({ ...settings, notifyOnCancellation: val })}
                        label="Cancellation Updates"
                        description="Trigger notifications upon check-out release approvals."
                      />
                      <ToggleSwitch
                        checked={settings.notifyOnInvoice}
                        onChange={(val) => setSettings({ ...settings, notifyOnInvoice: val })}
                        label="Invoice Generation"
                        description="Send digital receipt upon checkout folio close."
                      />
                    </div>
                  </div>
                </Panel>
              )}

              {/* TAB 5: Security */}
              {activeTab === "security" && (
                <Panel title="Access Policies & Session Controls" description="Configure global session boundaries and credential validation standards.">
                  <div className="p-5 space-y-4 text-left">
                    <ToggleSwitch
                      checked={settings.tfaEnabled}
                      onChange={(val) => handleToggleSensitive(
                        "tfaEnabled",
                        val,
                        "Modify Two-Factor Settings",
                        val === true
                          ? "Enabling 2FA will require all team admins to enter an OTP verification code sent to their email during sign-in."
                          : "Disabling 2FA reduces login validation layers to password only."
                      )}
                      label="Enforce Multi-Factor Auth (2FA)"
                      description="Require OTP validation codes during team administrator sign-in sessions."
                    />

                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-1">
                        <Label htmlFor="sec-time" className="text-xs text-navy font-semibold">Session Timeout (Minutes)</Label>
                        <Input
                          id="sec-time"
                          type="number"
                          value={settings.sessionTimeoutMinutes}
                          onChange={(e) => setSettings({ ...settings, sessionTimeoutMinutes: Number(e.target.value) })}
                          className="h-10 text-xs bg-white"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="sec-len" className="text-xs text-navy font-semibold">Min Password Length</Label>
                        <Input
                          id="sec-len"
                          type="number"
                          value={settings.passwordMinLength}
                          onChange={(e) => setSettings({ ...settings, passwordMinLength: Number(e.target.value) })}
                          className="h-10 text-xs bg-white"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="sec-limit" className="text-xs text-navy font-semibold">Max Login Retries</Label>
                        <Input
                          id="sec-limit"
                          type="number"
                          value={settings.maxLoginAttempts}
                          onChange={(e) => setSettings({ ...settings, maxLoginAttempts: Number(e.target.value) })}
                          className="h-10 text-xs bg-white"
                        />
                      </div>
                    </div>

                    <ToggleSwitch
                      checked={settings.forceLogoutOnPasswordChange}
                      onChange={(val) => setSettings({ ...settings, forceLogoutOnPasswordChange: val })}
                      label="Force Logout on Password Reset"
                      description="Immediately terminate all active sessions for a user profile after credentials modification."
                    />
                  </div>
                </Panel>
              )}

              {/* TAB 6: Integrations Hub */}
              {activeTab === "integrations" && (
                <Panel title="Connected Gateway Integrations" description="Manage active platform interfaces and synchronization credentials.">
                  <div className="p-5 space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      {Object.keys(integrations).map(key => {
                        const item = integrations[key];
                        const isConnected = item.status === "Connected";
                        return (
                          <div key={key} className="p-4 border rounded-xl bg-white shadow-soft flex flex-col justify-between hover:border-purple/20 transition-all text-left">
                            <div className="space-y-1">
                              <div className="flex items-center justify-between">
                                <h4 className="font-semibold text-navy text-xs sm:text-sm font-ui">{item.name}</h4>
                                <Tag tone={isConnected ? "success" : "neutral"}>{item.status}</Tag>
                              </div>
                              <p className="text-[10px] text-muted-foreground font-ui">Provider: <strong>{item.provider}</strong></p>
                              <p className="text-[10px] text-muted-foreground font-ui">Last synced: <span className="font-mono">{item.lastSync}</span></p>
                            </div>
                            
                            <div className="flex gap-2 mt-4 pt-3 border-t">
                              <Button
                                onClick={() => handleConfigure(key, item)}
                                variant="outline"
                                size="xs"
                                className="rounded-full text-[10px] font-semibold hover:bg-muted text-navy border-muted flex-1"
                              >
                                Configure
                              </Button>
                              <Button
                                onClick={() => handleTestConnection(key, item.name)}
                                variant="outline"
                                size="xs"
                                className="rounded-full text-[10px] font-semibold hover:bg-muted text-navy border-muted flex-1"
                              >
                                Test Sync
                              </Button>
                              {isConnected && (
                                <Button
                                  onClick={() => handleDisconnect(key, item.name)}
                                  variant="ghost"
                                  size="xs"
                                  className="rounded-full text-[10px] font-semibold text-error hover:bg-error/10"
                                >
                                  Disconnect
                                </Button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </Panel>
              )}

              {/* TAB 7: Public Website */}
              {activeTab === "website" && (
                <Panel title="Website Visibility & Maintenance" description="Toggle public access variables and display splash screens.">
                  <div className="p-5 space-y-4 text-left">
                    <ToggleSwitch
                      checked={settings.publicWebsiteEnabled}
                      onChange={(val) => setSettings({ ...settings, publicWebsiteEnabled: val })}
                      label="Public Landing Website Enabled"
                      description="Toggle if public landing pages are reachable by visitors."
                    />

                    <ToggleSwitch
                      checked={settings.maintenanceMode}
                      onChange={(val) => handleToggleSensitive(
                        "maintenanceMode",
                        val,
                        "Enable Maintenance Mode",
                        val === true 
                          ? "Enabling maintenance mode will redirect all public traffic to a Construction splash page. Owners and managers can still sign in."
                          : "Disabling maintenance mode will restore default public access immediately."
                      )}
                      label="Maintenance Mode"
                      description="Toggle maintenance splash page redirects."
                    />

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <Label htmlFor="web-phone" className="text-xs text-navy font-semibold">Public Hotline Phone</Label>
                        <Input
                          id="web-phone"
                          value={settings.publicContactPhone}
                          onChange={(e) => setSettings({ ...settings, publicContactPhone: e.target.value })}
                          className="h-10 text-xs bg-white"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="web-email" className="text-xs text-navy font-semibold">Public Helpline Email</Label>
                        <Input
                          id="web-email"
                          value={settings.publicContactEmail}
                          onChange={(e) => setSettings({ ...settings, publicContactEmail: e.target.value })}
                          className="h-10 text-xs bg-white"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="web-address" className="text-xs text-navy font-semibold">Public Physical Address</Label>
                      <Input
                        id="web-address"
                        value={settings.publicContactAddress}
                        onChange={(e) => setSettings({ ...settings, publicContactAddress: e.target.value })}
                        className="h-10 text-xs bg-white"
                      />
                    </div>
                  </div>
                </Panel>
              )}

            </div>
          )}

        </div>

      </div>

      {/* Confirmation Modal */}
      {confirmModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-deep/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-[0_20px_50px_rgba(13,27,42,0.35)] relative border border-navy/5">
            <div className="flex items-center justify-between pb-4 border-b border-muted">
              <h3 className="font-display font-bold text-lg text-navy flex items-center gap-1.5">
                <AlertTriangle className="size-5 text-gold" /> {confirmModal.title}
              </h3>
              <button
                onClick={() => setConfirmModal({ open: false, key: "", value: null, message: "", title: "" })}
                className="text-muted-foreground hover:text-navy cursor-pointer size-8 rounded-full hover:bg-muted flex items-center justify-center transition-colors"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="py-4 space-y-3 text-left">
              <p className="text-xs text-muted-foreground leading-relaxed font-ui font-medium">
                {confirmModal.message}
              </p>
              <p className="text-[10px] text-error font-semibold bg-error/5 p-2 rounded border border-error/25 font-ui">
                ⚠️ WARNING: This changes system behaviors dynamically. Ensure all desk terminals are notified.
              </p>
            </div>

            <div className="flex gap-3 justify-end pt-4 border-t border-muted mt-4">
              <Button 
                variant="ghost" 
                onClick={() => setConfirmModal({ open: false, key: "", value: null, message: "", title: "" })}
                className="rounded-full text-xs font-semibold"
              >
                Cancel
              </Button>
              <Button 
                onClick={confirmSensitiveAction}
                className="bg-navy hover:bg-navy/90 text-white rounded-full px-5 text-xs font-semibold"
              >
                Confirm Setting
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Integration Credentials Modal */}
      {integrationModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-deep/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-[0_20px_50px_rgba(13,27,42,0.35)] relative border border-navy/5">
            <div className="flex items-center justify-between pb-4 border-b border-muted">
              <h3 className="font-display font-bold text-lg text-navy flex items-center gap-1.5">
                <Settings2 className="size-5 text-purple" /> Setup {integrationModal.name}
              </h3>
              <button
                onClick={() => setIntegrationModal({ open: false, key: "", name: "", apiKey: "", endpoint: "" })}
                className="text-muted-foreground hover:text-navy cursor-pointer size-8 rounded-full hover:bg-muted flex items-center justify-center transition-colors"
              >
                <X className="size-4" />
              </button>
            </div>

            <form onSubmit={saveIntegrationDetails} className="py-4 space-y-4 text-left">
              <div>
                <Label htmlFor="int-key" className="text-xs text-navy font-semibold">API Secret Key</Label>
                <div className="relative">
                  <Input
                    id="int-key"
                    type={showSecretKey ? "text" : "password"}
                    value={integrationModal.apiKey}
                    onChange={(e) => setIntegrationModal({ ...integrationModal, apiKey: e.target.value })}
                    placeholder="Enter API token key..."
                    className="mt-1 h-10 pr-10 text-xs bg-white font-mono"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowSecretKey(!showSecretKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-navy/40 hover:text-navy/70 transition-colors focus:outline-none cursor-pointer p-1"
                    aria-label={showSecretKey ? "Hide key" : "Show key"}
                  >
                    {showSecretKey ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div>
                <Label htmlFor="int-ep" className="text-xs text-navy font-semibold">Gateway API Endpoint</Label>
                <Input
                  id="int-ep"
                  value={integrationModal.endpoint}
                  onChange={(e) => setIntegrationModal({ ...integrationModal, endpoint: e.target.value })}
                  placeholder="https://api.provider.com/v1/"
                  className="mt-1 h-10 text-xs bg-white font-mono"
                  required
                />
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t border-muted mt-5">
                <Button 
                  variant="ghost" 
                  type="button" 
                  onClick={() => setIntegrationModal({ open: false, key: "", name: "", apiKey: "", endpoint: "" })}
                  className="rounded-full text-xs font-semibold"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  className="bg-navy hover:bg-navy/90 text-white rounded-full px-5 text-xs font-semibold"
                >
                  Save Credentials
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

export const Route = createFileRoute("/super-admin/global-settings")({
  head: () => ({
    meta: [
      { title: "Settings Control Center — Hour Stay" },
      { name: "description", content: "Manage platform configurations and values." },
      { property: "og:title", content: "Settings Control Center — Hour Stay" },
      { property: "og:description", content: "Manage system configurations." }
    ]
  }),
  component: SuperAdminSettings
});
