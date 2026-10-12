import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";

import { Button } from "@/components/ui/button";
import { FormField, Input, Select } from "@/components/hs/FormFields";
import { toast } from "sonner";
import { Bed, ArrowLeft, Upload, Trash2, Snowflake, Wind, Sparkles, Info, Check } from "lucide-react";
import { superAdminService } from "@/services/superAdmin";
import { adminService } from "@/services/admin";
import { validateWithZod, roomSchema } from "@/schemas";

export const Route = createFileRoute("/admin/rooms/add")({
  head: () => ({
    meta: [
      { title: "Add Room — Speshway Luxury Hotel" }
    ]
  }),
  component: AddRoomPage
});

function AddRoomPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [properties, setProperties] = useState([]);
  const [fieldErrors, setFieldErrors] = useState({});

  // Room Variant state: 'AC' (Air Conditioned) or 'Non-AC'
  const [roomVariant, setRoomVariant] = useState("AC");
  const [existingRooms, setExistingRooms] = useState([]);

  // Load existing room types from database
  const [roomTypes, setRoomTypes] = useState([
    { category: "Standard Room", baseRate: 3000, ratePlan: "Standard Plan", occupancy: "2 Adults", amenities: "Air Conditioning, High-speed Wi-Fi, Flat Screen TV" },
    { category: "Deluxe Room", baseRate: 4500, ratePlan: "Deluxe Plan", occupancy: "2 Adults + 1 Child", amenities: "Balcony View, Smart TV, Room Service" },
    { category: "Executive Suite", baseRate: 6500, ratePlan: "Deluxe Plan", occupancy: "4 Adults", amenities: "Jacuzzi Bath, Living Room, Espresso Machine, Airport Transfer" },
    { category: "Villa Suite", baseRate: 12500, ratePlan: "Weekend Plan", occupancy: "4 Adults", amenities: "Private Plunge Pool, Garden Courtyard, Personal Host" }
  ]);

  // Form Fields States
  const [roomNumber, setRoomNumber] = useState("");
  const [selectedType, setSelectedType] = useState("Standard Room");
  const [floor, setFloor] = useState("Floor 1");
  const [capacity, setCapacity] = useState("2 Adults");
  const [bedType, setBedType] = useState("King Bed");
  const [amenities, setAmenities] = useState("Air Conditioning, High-speed Wi-Fi, Flat Screen TV");
  const [baseRate, setBaseRate] = useState("3000");
  const [ratePlan, setRatePlan] = useState("Standard Plan");
  const [status, setStatus] = useState("Available");
  const [description, setDescription] = useState("");
  
  // Image Upload States
  const [images, setImages] = useState([]);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Custom Category Fields
  const [newTypeName, setNewTypeName] = useState("");
  const [newTypeRate, setNewTypeRate] = useState("");
  const [newTypeOccupancy, setNewTypeOccupancy] = useState("2 Adults");

  useEffect(() => {
    async function init() {
      try {
        const [propsRes, roomsRes] = await Promise.all([
          superAdminService.getProperties().catch(() => ({})),
          adminService.getRooms().catch(() => ({}))
        ]);

        if (propsRes.success && propsRes.data && propsRes.data.length > 0) {
          setProperties(propsRes.data);
          const settings = propsRes.data[0].settings || {};
          if (settings.roomTypes) {
            setRoomTypes(settings.roomTypes);
          }
        }

        if (roomsRes.success && Array.isArray(roomsRes.data)) {
          setExistingRooms(roomsRes.data);
        }

        // Support URL parameters: /admin/rooms/add?roomNumber=101&variant=Non-AC
        if (typeof window !== "undefined") {
          const urlParams = new URLSearchParams(window.location.search);
          const paramRoom = urlParams.get("roomNumber");
          const paramVariant = urlParams.get("variant");
          const paramFloor = urlParams.get("floor");
          const paramCategory = urlParams.get("category");

          if (paramRoom) {
            setRoomNumber(paramRoom);
            const firstDigit = paramRoom.trim().charAt(0);
            if (!isNaN(Number(firstDigit)) && Number(firstDigit) >= 1 && Number(firstDigit) <= 9) {
              setFloor(`Floor ${firstDigit}`);
            }
          }
          if (paramFloor) {
            setFloor(paramFloor);
          }
          if (paramCategory) {
            setSelectedType(paramCategory);
          }
          if (paramVariant) {
            const isNon = paramVariant.toLowerCase().includes("non");
            setRoomVariant(isNon ? "Non-AC" : "AC");
            if (isNon) {
              setAmenities("High-speed Wi-Fi, Flat Screen TV, Ceiling Fan");
              setBaseRate("2200");
            }
          }
        }
      } catch (err) {}
    }
    init();
  }, []);

  const handleVariantToggle = (variant) => {
    setRoomVariant(variant);
    if (variant === "Non-AC") {
      // Remove AC amenities and add Non-AC / ceiling fan default
      const filtered = amenities
        .split(",")
        .map(a => a.trim())
        .filter(a => !a.toLowerCase().includes("air condition") && !a.toLowerCase().includes("ac"));
      if (!filtered.some(a => a.toLowerCase().includes("fan"))) {
        filtered.push("Ceiling Fan");
      }
      setAmenities(filtered.filter(Boolean).join(", "));
      // If default baseRate was 3000+, suggest standard Non-AC rate
      if (Number(baseRate) >= 3000) {
        setBaseRate("2200");
      }
    } else {
      // Restore / ensure Air Conditioning is in amenities
      const items = amenities.split(",").map(a => a.trim()).filter(Boolean);
      if (!items.some(a => a.toLowerCase().includes("air condition"))) {
        items.unshift("Air Conditioning");
      }
      setAmenities(items.filter(a => a.toLowerCase() !== "ceiling fan").join(", "));
      if (Number(baseRate) <= 2500) {
        setBaseRate("3000");
      }
    }
  };

  const handleImageFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploadingImage(true);
      const res = await adminService.uploadImage(file);
      const uploadedUrl = res.data?.url || res.data?.secure_url || res.url || res.secure_url || (typeof res.data === 'string' ? res.data : null);
      if (uploadedUrl) {
        setImages(prev => [...prev, uploadedUrl]);
        toast.success("Room photo uploaded successfully!");
      } else {
        toast.error("Failed to parse image URL from upload response.");
      }
    } catch (err) {
      toast.error(err.message || "Failed to upload image.");
    } finally {
      setUploadingImage(false);
    }
  };

  const handleRemoveImage = (indexToRemove) => {
    setImages(prev => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleTypeChange = (e) => {
    const typeVal = e.target.value;
    setSelectedType(typeVal);

    if (typeVal !== "new") {
      const matched = roomTypes.find(t => t.category === typeVal);
      if (matched) {
        let rateToSet = matched.baseRate || 3000;
        if (roomVariant === "Non-AC" && rateToSet >= 3000) {
          rateToSet = Math.max(1500, Math.round(rateToSet * 0.75));
        }
        setBaseRate(rateToSet.toString());
        if (matched.ratePlan) setRatePlan(matched.ratePlan);
        setCapacity(matched.occupancy || "2 Adults");

        let matchedAmenities = matched.amenities || "";
        if (roomVariant === "Non-AC") {
          matchedAmenities = String(matchedAmenities)
            .split(",")
            .map(s => s.trim())
            .filter(s => !s.toLowerCase().includes("air condition") && !s.toLowerCase().includes("ac"))
            .join(", ");
        }
        setAmenities(matchedAmenities);
      }
    } else {
      setBaseRate("");
      setCapacity("2 Adults");
      setAmenities("");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const val = validateWithZod(roomSchema, {
      roomNumber,
      type: selectedType === "new" ? newTypeName : selectedType,
      floor,
      baseRate,
      capacity
    });

    if (!val.isValid) {
      setFieldErrors(val.errors);
      toast.error(val.firstError);
      return;
    }
    setFieldErrors({});

    const finalRate = Number(baseRate);
    setLoading(true);

    try {
      let finalCategory = selectedType;

      if (selectedType === "new") {
        if (!newTypeName || !newTypeRate || isNaN(Number(newTypeRate)) || Number(newTypeRate) <= 0) {
          toast.error("Valid Category name and Base Rate (> ₹0) are required for new room types.");
          setLoading(false);
          return;
        }

        finalCategory = newTypeName.trim();

        const newCategoryObj = {
          _id: `T-${Date.now()}`,
          category: finalCategory,
          roomsCount: 1,
          occupancy: newTypeOccupancy,
          baseRate: Number(newTypeRate),
          activePlans: 2,
          amenities: [],
          status: "Active"
        };

        const updatedTypes = [...roomTypes, newCategoryObj];
        
        if (properties.length > 0) {
          const prop = properties[0];
          const nextSettings = {
            ...(prop.settings || {}),
            roomTypes: updatedTypes
          };
          await superAdminService.updateProperty(prop._id || prop.id, { settings: nextSettings });
        }
        setRoomTypes(updatedTypes);
      }

      await adminService.createRoom({
        roomNumber,
        category: finalCategory,
        type: roomVariant,
        status: status || 'Available',
        ratePlan: ratePlan || 'Standard Plan',
        baseRate: finalRate,
        currentRate: finalRate,
        dailyRate: finalRate,
        floor,
        capacity,
        bedType,
        amenities,
        description,
        images
      });

      // Realtime Socket broadcast so Admin, Manager, Receptionist, and Search auto-refresh
      import('@/services/socket').then(({ emitRealtimeEvent }) => {
        try {
          emitRealtimeEvent('room_created', { action: 'room_added', roomNumber, category: finalCategory, type: roomVariant });
          emitRealtimeEvent('room_status_changed', { action: 'room_added', roomNumber, status: status || 'Available' });
          emitRealtimeEvent('availability_changed', { action: 'room_added', roomNumber });
          emitRealtimeEvent('dashboard_sync', { action: 'room_added', roomNumber });
        } catch (e) {}
      }).catch(() => {});

      toast.success(`Room #${roomNumber} (${roomVariant} - ${finalCategory}) registered successfully with rate ₹${finalRate.toLocaleString('en-IN')}!`);
      navigate({ to: "/admin/rooms" });
    } catch (err) {
      toast.error(err.message || "Failed to create room.");
    } finally {
      setLoading(false);
    }
  };

  const matchingExistingRooms = existingRooms.filter(
    r => String(r.roomNumber || r.num).trim() === String(roomNumber).trim()
  );

  return (
    <div className="space-y-6 text-left font-sans animate-fade-in font-ui">
      <div className="max-w-2xl">
        <div className="bg-white rounded-2xl border border-navy/10 shadow-soft overflow-hidden">
          <form onSubmit={handleSubmit} className="p-6 space-y-5 text-left">

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Room Number" required id="roomNumber" status={fieldErrors.roomNumber ? "error" : undefined} errorMsg={fieldErrors.roomNumber}>
                <Input
                  id="roomNumber"
                  required
                  placeholder="e.g. 101, 204, 305, 402"
                  value={roomNumber}
                  onChange={(e) => {
                    const val = e.target.value;
                    setRoomNumber(val);
                    if (fieldErrors.roomNumber) setFieldErrors(p => ({ ...p, roomNumber: null }));
                    if (val && val.trim().length > 0) {
                      const firstDigit = val.trim().charAt(0);
                      if (!isNaN(Number(firstDigit)) && Number(firstDigit) >= 1 && Number(firstDigit) <= 9) {
                        setFloor(`Floor ${firstDigit}`);
                      }
                    }
                  }}
                  className="font-mono font-bold"
                />
              </FormField>

              <FormField label="Floor" required id="floor">
                <Select
                  id="floor"
                  value={floor}
                  onChange={(e) => setFloor(e.target.value)}
                  className="font-bold text-xs h-10"
                >
                  <option value="Floor 1">Floor 1</option>
                  <option value="Floor 2">Floor 2</option>
                  <option value="Floor 3">Floor 3</option>
                  <option value="Floor 4">Floor 4</option>
                </Select>
              </FormField>
            </div>

            {/* Smart Detection if Room already exists with other configurations */}
            {roomNumber && matchingExistingRooms.length > 0 && (
              <div className="p-3.5 bg-brand/5 border border-brand/20 rounded-xl text-xs space-y-1">
                <div className="font-bold text-navy flex items-center gap-1.5">
                  <Sparkles className="size-4 text-brand" />
                  <span>Room #{roomNumber} has existing configuration</span>
                </div>
                <p className="text-muted-foreground text-[11px] leading-relaxed">
                  Room #{roomNumber} is currently registered as{" "}
                  <span className="font-semibold text-navy">
                    {matchingExistingRooms.map(r => `${r.category} (${r.type || 'AC'} · ₹${r.currentRate || r.baseRate})`).join(", ")}
                  </span>.
                  You can add a <span className="font-bold text-brand">{roomVariant}</span> variant with distinct tariffs and amenities.
                </p>
              </div>
            )}

            {/* AC / Non-AC Variant Selector */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-navy">
                Room Climate & Variant (AC / Non-AC)
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => handleVariantToggle("AC")}
                  className={`p-3 rounded-xl border text-left transition-all flex items-start gap-2.5 cursor-pointer ${
                    roomVariant === "AC"
                      ? "border-purple bg-purple/5 ring-2 ring-purple/20 text-purple"
                      : "border-muted/50 hover:border-navy/20 bg-white text-muted-foreground"
                  }`}
                >
                  <div className={`p-1.5 rounded-lg shrink-0 ${roomVariant === "AC" ? "bg-purple text-white" : "bg-muted/30 text-muted-foreground"}`}>
                    <Snowflake className="size-4" />
                  </div>
                  <div>
                    <div className="font-bold text-xs text-navy flex items-center gap-1">
                      AC Room
                      {roomVariant === "AC" && <Check className="size-3 text-purple" />}
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">Air conditioned · AC amenities included</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleVariantToggle("Non-AC")}
                  className={`p-3 rounded-xl border text-left transition-all flex items-start gap-2.5 cursor-pointer ${
                    roomVariant === "Non-AC"
                      ? "border-emerald-600 bg-emerald-50 ring-2 ring-emerald-500/20 text-emerald-800"
                      : "border-muted/50 hover:border-navy/20 bg-white text-muted-foreground"
                  }`}
                >
                  <div className={`p-1.5 rounded-lg shrink-0 ${roomVariant === "Non-AC" ? "bg-emerald-600 text-white" : "bg-muted/30 text-muted-foreground"}`}>
                    <Wind className="size-4" />
                  </div>
                  <div>
                    <div className="font-bold text-xs text-navy flex items-center gap-1">
                      Non-AC Room
                      {roomVariant === "Non-AC" && <Check className="size-3 text-emerald-600" />}
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">Non-Air Conditioned · Budget tariff & fan</div>
                  </div>
                </button>
              </div>
            </div>

            <FormField label="Room Category / Type" required id="category">
              <Select
                id="category"
                value={selectedType}
                onChange={handleTypeChange}
                className="font-bold text-xs h-10"
              >
                {roomTypes.map((t, idx) => (
                  <option key={idx} value={t.category}>
                    {t.category} (Standard Base: ₹{t.baseRate?.toLocaleString('en-IN') || 3500})
                  </option>
                ))}
                <option value="new">+ Create Custom Room Type...</option>
              </Select>
            </FormField>

            {selectedType === "new" && (
              <div className="p-4 bg-muted/20 border border-muted rounded-xl space-y-3">
                <h4 className="text-xs font-bold text-navy uppercase tracking-wider">New Custom Category Definition</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <FormField label="Category Name" required id="newTypeName">
                    <Input
                      id="newTypeName"
                      placeholder="e.g. Royal Ocean Suite"
                      value={newTypeName}
                      onChange={(e) => setNewTypeName(e.target.value)}
                    />
                  </FormField>
                  <FormField label="Default Base Rate (₹)" required id="newTypeRate">
                    <Input
                      id="newTypeRate"
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="e.g. 18500"
                      value={newTypeRate}
                      onChange={(e) => setNewTypeRate(e.target.value)}
                    />
                  </FormField>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Capacity / Occupancy" required id="capacity">
                <Select
                  id="capacity"
                  value={capacity}
                  onChange={(e) => setCapacity(e.target.value)}
                  className="font-bold text-xs h-10"
                >
                  <option value="2 Adults">2 Adults</option>
                  <option value="2 Adults + 1 Child">2 Adults + 1 Child</option>
                  <option value="4 Adults">4 Adults</option>
                  <option value="6 Adults">6 Adults</option>
                </Select>
              </FormField>

              <FormField label="Bed Configuration" required id="bedType">
                <Select
                  id="bedType"
                  value={bedType}
                  onChange={(e) => setBedType(e.target.value)}
                  className="font-bold text-xs h-10"
                >
                  <option value="King Bed">King Bed</option>
                  <option value="Queen Bed">Queen Bed</option>
                  <option value="Double Bed">Double Bed</option>
                  <option value="Twin Beds">Twin Beds</option>
                  <option value="Single Bed">Single Bed</option>
                </Select>
              </FormField>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Base Rate (₹)" required id="baseRate">
                <Input
                  id="baseRate"
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  placeholder="e.g. 12000"
                  value={baseRate}
                  onChange={(e) => setBaseRate(e.target.value)}
                />
              </FormField>

              <FormField label="Active Rate Plan" required id="ratePlan">
                <Select
                  id="ratePlan"
                  value={ratePlan}
                  onChange={(e) => setRatePlan(e.target.value)}
                  className="font-bold text-xs h-10"
                >
                  <option value="Standard Plan">Standard Plan</option>
                  <option value="Deluxe Plan">Deluxe Plan</option>
                  <option value="Weekend Plan">Weekend Plan</option>
                </Select>
              </FormField>
            </div>

            <FormField label="Room Amenities (comma separated)" id="amenities">
              <Input
                id="amenities"
                placeholder="e.g. Minibar, Royal Balcony, Workspace"
                value={amenities}
                onChange={(e) => setAmenities(e.target.value)}
              />
            </FormField>

            <FormField label="Operational Status" required id="status">
              <Select
                id="status"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="font-bold text-xs h-10"
              >
                <option value="Available">Available</option>
                <option value="Occupied">Occupied</option>
                <option value="Blocked">Blocked</option>
              </Select>
            </FormField>

            {/* Room Images Section */}
            <div className="space-y-3 border-t border-navy/10 pt-4">
              <div className="flex justify-between items-center">
                <label className="block text-xs font-bold uppercase tracking-wider text-navy">Room Images</label>
                {images.length > 0 && (
                  <span className="text-[10px] font-bold text-purple bg-purple/10 px-2.5 py-0.5 rounded-full border border-purple/20">
                    {images.length} Photo{images.length > 1 ? 's' : ''} Uploaded
                  </span>
                )}
              </div>
              
              <div className="p-6 border-2 border-dashed border-navy/20 bg-navy/[0.02] hover:bg-navy/[0.05] hover:border-navy/40 transition-all rounded-2xl text-center group cursor-pointer relative">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageFileUpload}
                  disabled={uploadingImage}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
                <div className="flex flex-col items-center justify-center space-y-2 pointer-events-none">
                  <div className="size-12 rounded-full bg-navy/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Upload className="size-5 text-navy" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-navy group-hover:underline">
                      {uploadingImage ? "Uploading Photo..." : "Click to Upload Room Photo"}
                    </span>
                    <p className="text-[11px] text-muted-foreground mt-0.5">PNG, JPG or WEBP up to 10MB</p>
                  </div>
                </div>
              </div>

              {images.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                  {images.map((imgUrl, idx) => (
                    <div key={idx} className="relative group rounded-xl overflow-hidden border border-navy/10 h-28 bg-white shadow-soft">
                      <img src={imgUrl} alt={`Room photo ${idx + 1}`} className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(idx)}
                        className="absolute top-1.5 right-1.5 bg-red-600 text-white rounded-full p-1.5 opacity-90 hover:opacity-100 transition-opacity shadow-lift cursor-pointer z-20"
                        title="Remove photo"
                      >
                        <Trash2 className="size-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <FormField label="Internal Description" id="description">
              <textarea
                id="description"
                className="w-full min-h-[90px] p-3 border border-[#E7E9EE] hover:border-navy/20 focus:border-navy focus:ring-2 focus:ring-navy/10 rounded-lg text-sm transition-all focus:outline-none"
                placeholder="Write any internal operational remarks or details..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </FormField>

            <div className="pt-4 border-t border-muted/50 flex justify-end gap-3">
              <Button type="button" variant="ghost" onClick={() => navigate({ to: "/admin/rooms" })} className="text-xs h-10 px-5 cursor-pointer">
                Cancel
              </Button>
              <Button type="submit" disabled={loading} className="bg-navy hover:bg-navy-deep text-white text-xs h-10 px-6 font-bold rounded-full shadow-soft cursor-pointer">
                {loading ? "Registering Room..." : "Create & Save Room"}
              </Button>
            </div>

          </form>
        </div>
      </div>
    </div>
  );
}

export default AddRoomPage;
