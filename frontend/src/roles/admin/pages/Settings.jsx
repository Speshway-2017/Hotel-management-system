import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { HorizontalRouteTabs, Panel, Notice } from "@/components/hs/kit";
import { Button } from "@/components/ui/button";
import { FormField, Input, Select, Textarea, Checkbox } from "@/components/hs/FormFields";
import { Settings as SettingsIcon, User, Building2 } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { adminService } from "@/services/admin";

const settingsTabs = [
  { label: "Hotel Profile", to: "/admin/settings?tab=hotel-info", icon: Building2 },
  { label: "Account Profile", to: "/admin/profile", icon: User }
];

export const Route = createFileRoute("/admin/settings")({
  head: () => ({
    meta: [
      { title: "Property Settings — Speshway Luxury Hotel" },
      { name: "description", content: "Configure property-level settings, overrides, tax rules, templates and check-in policies." }
    ]
  }),
  component: AdminSettingsPage
});

function AdminSettingsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get("tab");
  
  const [activeSubTab, setActiveSubTab] = useState("hotel-info");
  
  const [hotelName, setHotelName] = useState("");
  const [hotelAddress, setHotelAddress] = useState("");
  const [hotelPhone, setHotelPhone] = useState("");
  const [hotelEmail, setHotelEmail] = useState("");
  const [description, setDescription] = useState("");
  const [logo, setLogo] = useState("");
  const [photos, setPhotos] = useState([]);
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [country, setCountry] = useState("");
  const [pincode, setPincode] = useState("");
  const [website, setWebsite] = useState("");
  const [classification, setClassification] = useState("3-Star");
  const [amenities, setAmenities] = useState("");
  const [highlights, setHighlights] = useState("");
  const [propertyPolicies, setPropertyPolicies] = useState("");
  const [locationMap, setLocationMap] = useState("");
  const [facebook, setFacebook] = useState("");
  const [instagram, setInstagram] = useState("");
  const [twitter, setTwitter] = useState("");
  const [linkedin, setLinkedin] = useState("");
  
  const [gstin, setGstin] = useState("36AAAAA1111A1Z1");
  const [cgst, setCgst] = useState(9);
  const [sgst, setSgst] = useState(9);

  const [checkInTime, setCheckInTime] = useState("12:00");
  const [checkOutTime, setCheckOutTime] = useState("11:00");
  const [cancelPolicy, setCancelPolicy] = useState("Free cancellation up to 24 hours prior to check-in. Cancellation within 24 hours will attract a 1-night tariff penalty.");

  const [autoAssign, setAutoAssign] = useState(true);
  const [waitlistLimit, setWaitlistLimit] = useState(5);
  const [paymentProvider, setPaymentProvider] = useState("Razorpay");

  const [emailAlerts, setEmailAlerts] = useState(true);
  const [smsAlerts, setSmsAlerts] = useState(false);
  const [parityAlerts, setParityAlerts] = useState(true);

  const [successMsg, setSuccessMsg] = useState("");
  const [property, setProperty] = useState(null);

  useEffect(() => {
    if (tabParam) {
      setActiveSubTab(tabParam);
    }
  }, [tabParam]);

  useEffect(() => {
    async function init() {
      try {
        const res = await adminService.getProperty();
        if (res.success && res.data) {
          const prop = res.data;
          setProperty(prop);
          
          const s = prop.settings || {};
          setHotelName(s.hotelName || s.name || prop.name || "");
          setCity(s.city || prop.city || "");
          setHotelAddress(s.address || "");
          setHotelEmail(s.reservationEmail || s.email || "");
          setHotelPhone(s.contactNumber || s.phone || "");
          
          setDescription(s.description || "");
          setLogo(s.logo || "");
          setPhotos(s.gallery || s.photos || []);
          setState(s.state || "");
          setCountry(s.country || "India");
          setPincode(s.pincode || "");
          setWebsite(s.website || "");
          setClassification(s.classification || "3-Star");
          
          setAmenities(Array.isArray(s.amenities) ? s.amenities.join(", ") : s.amenities || "");
          setHighlights(Array.isArray(s.highlights) ? s.highlights.join(", ") : s.highlights || "");
          setPropertyPolicies(s.policies || s.propertyPolicies || s.bookingRules || "");
          setLocationMap(s.locationMap || s.mapInfo || "");
          setFacebook(s.facebook || "");
          setInstagram(s.instagram || "");
          setTwitter(s.twitter || "");
          setLinkedin(s.linkedin || "");
          
          if (s.gstin) setGstin(s.gstin);
          if (s.cgst) setCgst(s.cgst);
          if (s.sgst) setSgst(s.sgst);
          if (s.checkInTime) setCheckInTime(s.checkInTime);
          if (s.checkOutTime) setCheckOutTime(s.checkOutTime);
          if (s.cancellationPolicy || s.cancelPolicy) setCancelPolicy(s.cancellationPolicy || s.cancelPolicy);
          if (s.autoAssign !== undefined) setAutoAssign(s.autoAssign);
          if (s.waitlistLimit) setWaitlistLimit(s.waitlistLimit);
          if (s.paymentProvider) setPaymentProvider(s.paymentProvider);
          if (s.emailAlerts !== undefined) setEmailAlerts(s.emailAlerts);
          if (s.smsAlerts !== undefined) setSmsAlerts(s.smsAlerts);
          if (s.parityAlerts !== undefined) setParityAlerts(s.parityAlerts);
        }
      } catch (err) {
        console.error("Failed to load property settings:", err);
      }
    }
    init();
  }, []);

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const toastId = toast.loading("Uploading logo...");
      const res = await adminService.uploadImage(file);
      if (res.success && res.data?.url) {
        setLogo(res.data.url);
        toast.success("Logo uploaded successfully!", { id: toastId });
      } else {
        toast.error("Upload failed", { id: toastId });
      }
    } catch (err) {
      toast.error("Logo upload failed: " + err.message);
    }
  };

  const handlePhotoUpload = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const toastId = toast.loading(`Uploading ${files.length} photo(s)...`);
    try {
      const urls = [];
      for (let i = 0; i < files.length; i++) {
        const res = await adminService.uploadImage(files[i]);
        if (res.success && res.data?.url) {
          urls.push(res.data.url);
        }
      }
      setPhotos(prev => [...prev, ...urls]);
      toast.success("Photos uploaded successfully!", { id: toastId });
    } catch (err) {
      toast.error("Photos upload failed: " + err.message, { id: toastId });
    }
  };

  const handleRemovePhoto = (indexToRemove) => {
    setPhotos(prev => prev.filter((_, idx) => idx !== indexToRemove));
  };

  async function handleSave(e) {
    e.preventDefault();
    const toastId = toast.loading("Saving property settings to MongoDB...");
    try {
      const nextSettings = {
        ...(property?.settings || {}),
        hotelName,
        name: hotelName,
        description,
        logo,
        gallery: photos,
        photos: photos,
        reservationEmail: hotelEmail,
        email: hotelEmail,
        contactNumber: hotelPhone,
        phone: hotelPhone,
        address: hotelAddress,
        city,
        state,
        country,
        pincode,
        website,
        gstin,
        classification,
        amenities: typeof amenities === 'string' ? amenities.split(",").map(a => a.trim()).filter(Boolean) : (amenities || []),
        highlights: typeof highlights === 'string' ? highlights.split(",").map(h => h.trim()).filter(Boolean) : (highlights || []),
        checkInTime,
        checkOutTime,
        cancellationPolicy: cancelPolicy,
        cancelPolicy,
        policies: propertyPolicies,
        propertyPolicies,
        locationMap,
        facebook,
        instagram,
        twitter,
        linkedin,
        gstin,
        cgst: Number(cgst),
        sgst: Number(sgst),
        autoAssign,
        waitlistLimit: Number(waitlistLimit),
        paymentProvider,
        emailAlerts,
        smsAlerts,
        parityAlerts
      };

      const res = await adminService.updatePropertySettings(nextSettings);
      if (res.success) {
        // Re-fetch from backend MongoDB to verify persistence
        const fetchRes = await adminService.getProperty();
        if (fetchRes.success && fetchRes.data) {
          const updatedProp = fetchRes.data;
          setProperty(updatedProp);
          setHotelName(updatedProp.name || "");
          setCity(updatedProp.city || "");
          const s = updatedProp.settings || {};
          setLogo(s.logo || "");
          setPhotos(s.photos || s.gallery || []);
        }

        const propId = property?._id || property?.id;
        if (propId) {
          localStorage.setItem('selected_property_id', propId);
        }

        window.dispatchEvent(new Event('selected-property-changed'));
        toast.success("Hotel Profile updated and saved to MongoDB!", { id: toastId });
        setSuccessMsg("Property configuration updated and verified in MongoDB.");
        setTimeout(() => setSuccessMsg(""), 4000);
      } else {
        toast.error(res.message || "Failed to update property in MongoDB", { id: toastId });
      }
    } catch (err) {
      console.error("Save error:", err);
      toast.error(err.message || "Failed to save property configuration.", { id: toastId });
    }
  }

  return (
    <div className="space-y-6 text-left animate-fade-in">
      <HorizontalRouteTabs tabs={settingsTabs} />

      {successMsg && (
        <Notice tone="success" title="Settings Saved">
          {successMsg}
        </Notice>
      )}

      {/* Sub-tab navigation panel */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Left Sub-tab column */}
        <div className="lg:col-span-1 bg-white border border-muted rounded-xl p-3 shadow-soft space-y-1 self-start select-none">
          {[
            { id: "hotel-info", label: "Hotel Profile" },
            { id: "tax-gst", label: "Tax & GST Rule" },
            { id: "policies", label: "Policies & Timings" },
            { id: "payments", label: "Payments & Booking" },
            { id: "notifications", label: "Notification Prefs" }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveSubTab(tab.id);
                setSearchParams({ tab: tab.id });
              }}
              className={`w-full text-left px-4 py-2.5 rounded-lg text-xs font-bold transition-all ${
                activeSubTab === tab.id
                  ? "bg-navy text-white shadow-sm"
                  : "text-muted-foreground hover:bg-muted/15 hover:text-navy"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Right Form Content Column */}
        <form onSubmit={handleSave} className="lg:col-span-3">
          {activeSubTab === "hotel-info" && (
            <Panel title="Hotel Profile Information" description="Update property logo, photos, address, contact details, classification, and descriptions.">
              <div className="p-6 bg-white rounded-b-xl space-y-6">
                
                {/* Logo & Photo Section */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pb-6 border-b border-muted">
                  
                  {/* Logo Upload */}
                  <div className="space-y-2 text-left">
                    <label className="text-xs font-semibold text-navy">Hotel Logo</label>
                    <div className="flex items-center gap-4 mt-1">
                      <div className="size-16 rounded-xl border border-muted bg-cream/45 overflow-hidden flex items-center justify-center relative">
                        {logo ? (
                          <img src={logo} alt="Hotel Logo" className="size-full object-contain" />
                        ) : (
                          <span className="text-[10px] text-muted-foreground font-bold">No Logo</span>
                        )}
                      </div>
                      <div className="space-y-1">
                        <input 
                          type="file" 
                          id="logo-upload" 
                          accept="image/*" 
                          onChange={handleLogoUpload} 
                          className="hidden" 
                        />
                        <Button 
                          type="button" 
                          variant="outline" 
                          onClick={() => document.getElementById('logo-upload').click()}
                          className="text-[11px] h-8 px-3 border-navy/20 hover:bg-navy/5 text-navy font-bold rounded-lg cursor-pointer"
                        >
                          Upload Logo
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Photo Gallery Upload */}
                  <div className="md:col-span-2 space-y-2 text-left">
                    <label className="text-xs font-semibold text-navy">Property Photos / Gallery</label>
                    <div className="flex items-center gap-4 mt-1">
                      <input 
                        type="file" 
                        id="photo-upload" 
                        accept="image/*" 
                        multiple 
                        onChange={handlePhotoUpload} 
                        className="hidden" 
                      />
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => document.getElementById('photo-upload').click()}
                        className="text-[11px] h-8 px-3 border-navy/20 hover:bg-navy/5 text-navy font-bold rounded-lg cursor-pointer"
                      >
                        Upload Photos
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {photos.map((photo, idx) => (
                        <div key={idx} className="size-14 rounded-lg border border-muted bg-cream overflow-hidden relative group">
                          <img src={photo} alt={`Gallery ${idx}`} className="size-full object-cover" />
                          <button 
                            type="button" 
                            onClick={() => handleRemovePhoto(idx)}
                            className="absolute inset-0 bg-black/50 text-white font-bold text-[9px] opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer border-none"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Form Fields */}
                <div className="grid grid-cols-2 gap-4">
                  <FormField label="Hotel Name" required className="col-span-2" id="hotelName">
                    <Input
                      id="hotelName"
                      type="text"
                      required
                      value={hotelName}
                      onChange={(e) => setHotelName(e.target.value)}
                    />
                  </FormField>

                  <FormField label="Hotel Description" className="col-span-2" id="description">
                    <Textarea
                      id="description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Enter a compelling description for the guest booking website..."
                      className="min-h-[100px]"
                    />
                  </FormField>

                  <FormField label="Hotel Classification" id="classification">
                    <Select
                      id="classification"
                      value={classification}
                      onChange={(e) => setClassification(e.target.value)}
                    >
                      <option value="3-Star">3-Star Hotel</option>
                      <option value="4-Star">4-Star Hotel</option>
                      <option value="5-Star">5-Star Luxury Resort</option>
                      <option value="Heritage Haveli">Heritage Haveli</option>
                      <option value="Boutique Stay">Boutique Stay</option>
                      <option value="Beach Resort">Beach Resort</option>
                      <option value="Homestay">Boutique Homestay</option>
                    </Select>
                  </FormField>

                  <FormField label="Website Link" id="website">
                    <Input
                      id="website"
                      type="text"
                      value={website}
                      onChange={(e) => setWebsite(e.target.value)}
                      placeholder="e.g. https://www.hourstay.com"
                    />
                  </FormField>

                  <FormField label="Reservation Email" required id="hotelEmail">
                    <Input
                      id="hotelEmail"
                      type="email"
                      required
                      value={hotelEmail}
                      onChange={(e) => setHotelEmail(e.target.value)}
                    />
                  </FormField>

                  <FormField label="Contact Number" required id="hotelPhone">
                    <Input
                      id="hotelPhone"
                      type="text"
                      required
                      value={hotelPhone}
                      onChange={(e) => setHotelPhone(e.target.value)}
                    />
                  </FormField>

                  <FormField label="Physical Address" required className="col-span-2" id="hotelAddress">
                    <Textarea
                      id="hotelAddress"
                      required
                      value={hotelAddress}
                      onChange={(e) => setHotelAddress(e.target.value)}
                      className="min-h-[80px]"
                    />
                  </FormField>

                  <FormField label="City" required id="city">
                    <Input
                      id="city"
                      type="text"
                      required
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                    />
                  </FormField>

                  <FormField label="State" required id="state">
                    <Input
                      id="state"
                      type="text"
                      required
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      placeholder="e.g. Rajasthan"
                    />
                  </FormField>

                  <FormField label="Country" required id="country">
                    <Input
                      id="country"
                      type="text"
                      required
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      placeholder="e.g. India"
                    />
                  </FormField>

                  <FormField label="Pincode" required id="pincode">
                    <Input
                      id="pincode"
                      type="text"
                      required
                      value={pincode}
                      onChange={(e) => setPincode(e.target.value)}
                      placeholder="e.g. 302001"
                    />
                  </FormField>

                  <FormField label="Standard Check-In Time" required id="checkInTimeInfo">
                    <Input
                      id="checkInTimeInfo"
                      type="time"
                      required
                      value={checkInTime}
                      onChange={(e) => setCheckInTime(e.target.value)}
                    />
                  </FormField>

                  <FormField label="Standard Check-Out Time" required id="checkOutTimeInfo">
                    <Input
                      id="checkOutTimeInfo"
                      type="time"
                      required
                      value={checkOutTime}
                      onChange={(e) => setCheckOutTime(e.target.value)}
                    />
                  </FormField>

                  <FormField label="Hotel Amenities (Comma-separated)" className="col-span-2" id="amenities">
                    <Textarea
                      id="amenities"
                      value={amenities}
                      onChange={(e) => setAmenities(e.target.value)}
                      placeholder="WiFi, Swimming Pool, Complimentary Breakfast, Spa, Gym, Rooftop Restaurant"
                      className="min-h-[60px]"
                    />
                  </FormField>

                  <FormField label="Guest Highlights / Selling Points (Comma-separated)" className="col-span-2" id="highlights">
                    <Textarea
                      id="highlights"
                      value={highlights}
                      onChange={(e) => setHighlights(e.target.value)}
                      placeholder="5 mins from Amber Fort, Infinity Pool, Heritage courtyard dining"
                      className="min-h-[60px]"
                    />
                  </FormField>

                  <FormField label="Property Policies & House Rules" className="col-span-2" id="propertyPolicies">
                    <Textarea
                      id="propertyPolicies"
                      value={propertyPolicies}
                      onChange={(e) => setPropertyPolicies(e.target.value)}
                      placeholder="Valid ID required upon check-in. Pets not allowed. Unmarried couples permitted with valid ID."
                      className="min-h-[70px]"
                    />
                  </FormField>

                  <FormField label="Location/Map Embed URL" className="col-span-2" id="locationMap">
                    <Input
                      id="locationMap"
                      type="text"
                      value={locationMap}
                      onChange={(e) => setLocationMap(e.target.value)}
                      placeholder="Google Maps iframe src link"
                    />
                  </FormField>

                  <FormField label="Facebook Page" id="facebook">
                    <Input
                      id="facebook"
                      type="text"
                      value={facebook}
                      onChange={(e) => setFacebook(e.target.value)}
                    />
                  </FormField>

                  <FormField label="Instagram ID" id="instagram">
                    <Input
                      id="instagram"
                      type="text"
                      value={instagram}
                      onChange={(e) => setInstagram(e.target.value)}
                    />
                  </FormField>

                  <FormField label="Twitter ID" id="twitter">
                    <Input
                      id="twitter"
                      type="text"
                      value={twitter}
                      onChange={(e) => setTwitter(e.target.value)}
                    />
                  </FormField>

                  <FormField label="LinkedIn Profile" id="linkedin">
                    <Input
                      id="linkedin"
                      type="text"
                      value={linkedin}
                      onChange={(e) => setLinkedin(e.target.value)}
                    />
                  </FormField>
                </div>
                <div className="pt-4 border-t border-muted flex justify-end">
                  <Button type="submit" className="bg-navy hover:bg-navy/90 text-white text-xs h-9 px-6 font-bold shadow-soft rounded-full cursor-pointer font-sans">
                    Save Changes
                  </Button>
                </div>
              </div>
            </Panel>
          )}

          {activeSubTab === "tax-gst" && (
            <Panel title="Taxation & GST configuration" description="Specify active goods and service tax slabs.">
              <div className="p-6 bg-white rounded-b-xl space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField label="GSTIN ID" required className="col-span-2" id="gstin">
                    <Input
                      id="gstin"
                      type="text"
                      required
                      value={gstin}
                      onChange={(e) => setGstin(e.target.value)}
                      className="font-mono uppercase tracking-wider"
                    />
                  </FormField>

                  <FormField label="CGST Slabs (%)" required id="cgst">
                    <Input
                      id="cgst"
                      type="number"
                      required
                      value={cgst}
                      onChange={(e) => setCgst(Number(e.target.value))}
                    />
                  </FormField>

                  <FormField label="SGST Slabs (%)" required id="sgst">
                    <Input
                      id="sgst"
                      type="number"
                      required
                      value={sgst}
                      onChange={(e) => setSgst(Number(e.target.value))}
                    />
                  </FormField>
                </div>
                <div className="pt-4 border-t border-muted flex justify-end">
                  <Button type="submit" className="bg-navy hover:bg-navy/90 text-white text-xs h-9 px-6 font-bold shadow-soft rounded-full cursor-pointer">
                    Save Taxation Settings
                  </Button>
                </div>
              </div>
            </Panel>
          )}

          {activeSubTab === "policies" && (
            <Panel title="Timings & Cancellation Policies" description="Set check-in/out SLA limits and cancellation definitions.">
              <div className="p-6 bg-white rounded-b-xl space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField label="Standard Check-In Time" required id="checkInTime">
                    <Input
                      id="checkInTime"
                      type="time"
                      required
                      value={checkInTime}
                      onChange={(e) => setCheckInTime(e.target.value)}
                    />
                  </FormField>

                  <FormField label="Standard Check-Out Time" required id="checkOutTime">
                    <Input
                      id="checkOutTime"
                      type="time"
                      required
                      value={checkOutTime}
                      onChange={(e) => setCheckOutTime(e.target.value)}
                    />
                  </FormField>

                  <FormField label="Cancellation Policy Statement" required className="col-span-2" id="cancelPolicy">
                    <Textarea
                      id="cancelPolicy"
                      required
                      value={cancelPolicy}
                      onChange={(e) => setCancelPolicy(e.target.value)}
                      className="min-h-[100px]"
                    />
                  </FormField>
                </div>
                <div className="pt-4 border-t border-muted flex justify-end">
                  <Button type="submit" className="bg-navy hover:bg-navy/90 text-white text-xs h-9 px-6 font-bold shadow-soft rounded-full cursor-pointer">
                    Save Policy Changes
                  </Button>
                </div>
              </div>
            </Panel>
          )}

          {activeSubTab === "payments" && (
            <Panel title="Payments & Booking Preferences" description="Configure merchant provider bindings and automation limits.">
              <div className="p-6 bg-white rounded-b-xl space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField label="Payment Merchant Provider" id="paymentProvider">
                    <Select
                      id="paymentProvider"
                      value={paymentProvider}
                      onChange={(e) => setPaymentProvider(e.target.value)}
                    >
                      <option value="Razorpay">Razorpay Checkout API</option>
                      <option value="Stripe">Stripe GDS integration</option>
                      <option value="Paytm">Paytm Merchant SDK</option>
                    </Select>
                  </FormField>

                  <FormField label="Waitlist Max Capacity Limit" required id="waitlistLimit">
                    <Input
                      id="waitlistLimit"
                      type="number"
                      required
                      value={waitlistLimit}
                      onChange={(e) => setWaitlistLimit(Number(e.target.value))}
                    />
                  </FormField>

                  <div className="col-span-2 pt-2">
                    <Checkbox
                      id="autoAssign"
                      checked={autoAssign}
                      onChange={(e) => setAutoAssign(e.target.checked)}
                      label="Enable Auto Room Assignment on Confirmed bookings"
                    />
                  </div>
                </div>
                <div className="pt-4 border-t border-muted flex justify-end">
                  <Button type="submit" className="bg-navy hover:bg-navy/90 text-white text-xs h-9 px-6 font-bold shadow-soft rounded-full cursor-pointer">
                    Save Preferences
                  </Button>
                </div>
              </div>
            </Panel>
          )}

          {activeSubTab === "notifications" && (
            <Panel title="Property Notification Alerts" description="Configure alert channels for managers and receptionist operators.">
              <div className="p-6 bg-white rounded-b-xl space-y-4">
                <div className="space-y-4">
                  <div>
                    <Checkbox
                      id="emailAlerts"
                      checked={emailAlerts}
                      onChange={(e) => setEmailAlerts(e.target.checked)}
                      label="Email Notifications"
                    />
                    <p className="text-[10px] text-muted-foreground/80 ml-7">Send daily ledger summaries and cancellation audits to manager email.</p>
                  </div>

                  <div>
                    <Checkbox
                      id="smsAlerts"
                      checked={smsAlerts}
                      onChange={(e) => setSmsAlerts(e.target.checked)}
                      label="SMS Transaction Alerts"
                    />
                    <p className="text-[10px] text-muted-foreground/80 ml-7">Dispatch transaction confirmation texts directly to guests (standard carrier rates apply).</p>
                  </div>

                  <div>
                    <Checkbox
                      id="parityAlerts"
                      checked={parityAlerts}
                      onChange={(e) => setParityAlerts(e.target.checked)}
                      label="OTA Sync Failure Warning"
                    />
                    <p className="text-[10px] text-muted-foreground/80 ml-7">Enable high-priority console alerts if channel manager fails to sync rates within 2 minutes.</p>
                  </div>
                </div>
                <div className="pt-4 border-t border-muted flex justify-end">
                  <Button type="submit" className="bg-navy hover:bg-navy/90 text-white text-xs h-9 px-6 font-bold shadow-soft rounded-full cursor-pointer">
                    Save Notification Prefs
                  </Button>
                </div>
              </div>
            </Panel>
          )}
        </form>

      </div>
    </div>
  );
}