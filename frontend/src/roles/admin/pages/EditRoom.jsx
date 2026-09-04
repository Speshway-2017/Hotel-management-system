import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { PageHeader, Crumbs } from "@/components/hs/kit";
import { Button } from "@/components/ui/button";
import { FormField, Input, Select } from "@/components/hs/FormFields";
import { toast } from "sonner";
import { Bed, ArrowLeft, Upload, Trash2, Save } from "lucide-react";
import { superAdminService } from "@/services/superAdmin";
import { adminService } from "@/services/admin";

export const Route = createFileRoute("/admin/rooms/edit/$id")({
  head: () => ({
    meta: [
      { title: "Edit Room — Speshway Luxury Hotel" }
    ]
  }),
  component: EditRoomPage
});

function EditRoomPage() {
  const params = useParams() || {};
  const targetId = params?.id || (typeof window !== 'undefined' ? window.location.pathname.split('/').pop() : "");

  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [properties, setProperties] = useState([]);
  const [dbRoomId, setDbRoomId] = useState(targetId);

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
  const [amenities, setAmenities] = useState("");
  const [baseRate, setBaseRate] = useState("");
  const [ratePlan, setRatePlan] = useState("Standard Plan");
  const [status, setStatus] = useState("Available");
  const [description, setDescription] = useState("");

  // Image Management States
  const [images, setImages] = useState([]);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Custom Category Fields
  const [newTypeName, setNewTypeName] = useState("");
  const [newTypeRate, setNewTypeRate] = useState("");
  const [newTypeOccupancy, setNewTypeOccupancy] = useState("2 Adults");

  useEffect(() => {
    async function init() {
      try {
        const decodedTarget = decodeURIComponent(String(targetId)).trim();

        // 1. Fetch properties & room types
        let roomTypesArr = [];
        const res = await superAdminService.getProperties().catch(() => ({}));
        if (res.success && res.data && res.data.length > 0) {
          setProperties(res.data);
          const settings = res.data[0].settings || {};
          if (settings.roomTypes) {
            roomTypesArr = settings.roomTypes;
            setRoomTypes(settings.roomTypes);
          }
        }

        if (roomTypesArr.length === 0) {
          const saved = localStorage.getItem("hms_room_types_list_v2");
          if (saved) {
            try { roomTypesArr = JSON.parse(saved); } catch (e) {}
          }
        }

        // 2. Fetch rooms from backend
        const roomsRes = await adminService.getRooms().catch(() => ({}));
        let matched = null;

        if (roomsRes.success && roomsRes.data) {
          matched = roomsRes.data.find(r => 
            (r._id && String(r._id).toLowerCase() === decodedTarget.toLowerCase()) || 
            (r.id && String(r.id).toLowerCase() === decodedTarget.toLowerCase()) || 
            (r.roomNumber && String(r.roomNumber).toLowerCase() === decodedTarget.toLowerCase()) ||
            (r.category && String(r.category).toLowerCase() === decodedTarget.toLowerCase())
          );
        }

        // 3. Fallback matching against room types or room number conventions
        if (!matched) {
          const cleanNum = decodedTarget.match(/\d+/)?.[0] || (decodedTarget.length <= 4 ? decodedTarget : "101");
          let categoryName = "Standard Room";
          let rateVal = "3000";
          let capVal = "2 Adults";
          let amenVal = "Air Conditioning, High-speed Wi-Fi, Flat Screen TV";

          if (cleanNum.startsWith("2") || cleanNum.startsWith("4")) {
            categoryName = "Deluxe Room";
            rateVal = "4500";
            capVal = "2 Adults + 1 Child";
            amenVal = "Balcony View, Smart TV, Room Service, Air Conditioning";
          } else if (cleanNum.startsWith("3")) {
            categoryName = "Executive Suite";
            rateVal = "6500";
            capVal = "4 Adults";
            amenVal = "Jacuzzi Bath, Living Room, Espresso Machine, Airport Transfer";
          }

          const matchedType = roomTypesArr.find(t => 
            (t.category && t.category.toLowerCase() === decodedTarget.toLowerCase()) ||
            (t.category && t.category.toLowerCase() === categoryName.toLowerCase())
          );
          if (matchedType) {
            rateVal = String(matchedType.baseRate || rateVal);
            capVal = matchedType.occupancy || capVal;
            if (Array.isArray(matchedType.amenities)) {
              amenVal = matchedType.amenities.join(', ');
            }
          }

          matched = {
            _id: `R-${cleanNum}`,
            roomNumber: cleanNum,
            category: categoryName,
            status: "Available",
            ratePlan: "Standard Plan",
            baseRate: Number(rateVal),
            currentRate: Number(rateVal),
            dailyRate: Number(rateVal),
            floor: `Floor ${cleanNum[0] || '1'}`,
            capacity: capVal,
            bedType: "King Bed",
            amenities: amenVal,
            description: `Room #${cleanNum} (${categoryName}) particulars and hospitality amenities.`,
            images: []
          };
        }

        // 4. Pre-fill form input fields with OLD/EXISTING details
        if (matched) {
          setDbRoomId(matched._id || matched.id || targetId);
          setRoomNumber(matched.roomNumber || "101");
          setSelectedType(matched.category || "Standard Room");
          setStatus(matched.status || "Available");
          setRatePlan(matched.ratePlan || "Standard Plan");
          setBaseRate((matched.currentRate || matched.baseRate || matched.dailyRate || 3500).toString());
          
          let calculatedFloor = matched.floor;
          if (!calculatedFloor || calculatedFloor === 'Floor 1') {
            const firstDigit = matched.roomNumber ? String(matched.roomNumber).charAt(0) : '';
            if (firstDigit && !isNaN(Number(firstDigit)) && Number(firstDigit) >= 1 && Number(firstDigit) <= 9) {
              calculatedFloor = `Floor ${firstDigit}`;
            } else {
              calculatedFloor = matched.floor || 'Floor 1';
            }
          }
          setFloor(calculatedFloor);

          setCapacity(matched.capacity || "2 Adults");
          setBedType(matched.bedType || "King Bed");
          setAmenities(Array.isArray(matched.amenities) ? matched.amenities.join(', ') : (matched.amenities || "Air Conditioning, High-speed Wi-Fi"));
          setDescription(matched.description || "");
          if (Array.isArray(matched.images)) setImages(matched.images);
        }
      } catch (err) {
        toast.error("Failed to load room details.");
      }
    }
    if (targetId) {
      init();
    }
  }, [targetId]);

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
        setBaseRate((matched.baseRate || 3500).toString());
        if (matched.ratePlan) setRatePlan(matched.ratePlan);
        setCapacity(matched.occupancy || "2 Adults");
        setAmenities(matched.amenities || "");
      }
    } else {
      setBaseRate("");
      setCapacity("2 Adults");
      setAmenities("");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!roomNumber) {
      toast.error("Please enter a room number.");
      return;
    }

    const finalRate = Number(baseRate);
    if (!baseRate || isNaN(finalRate) || finalRate <= 0) {
      toast.error("Please enter a valid Base Rate (₹) greater than 0.");
      return;
    }

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

      const updateTarget = dbRoomId || targetId || roomNumber;
      await adminService.updateRoom(updateTarget, {
        roomNumber,
        category: finalCategory,
        status,
        ratePlan,
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

      toast.success(`Room #${roomNumber} updated successfully with rate ₹${finalRate.toLocaleString('en-IN')}!`);
      navigate({ to: "/admin/rooms" });
    } catch (err) {
      toast.error(err.message || "Failed to update room.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 text-left font-sans animate-fade-in font-ui">
      <div>
        <Crumbs items={[
          { label: "Workspace", to: "/admin" },
          { label: "Rooms & Rates", to: "/admin/rooms" },
          { label: `Edit Room ${roomNumber || targetId}` }
        ]} />
        <PageHeader
          title={`Edit Room ${roomNumber || targetId}`}
          subtitle="Modify room category, pricing structure, rate plan, photos, and operational status."
        />
      </div>

      <div className="max-w-2xl">
        <div className="bg-white rounded-2xl border border-navy/10 shadow-soft overflow-hidden">
          <form onSubmit={handleSubmit} className="p-6 space-y-5 text-left">

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Room Number" required id="roomNumber">
                <Input
                  id="roomNumber"
                  required
                  placeholder="e.g. 101, 204, 305"
                  value={roomNumber}
                  onChange={(e) => setRoomNumber(e.target.value)}
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
              <Button type="submit" disabled={loading} className="bg-navy hover:bg-navy-deep text-white text-xs h-10 px-6 font-bold rounded-full shadow-soft flex items-center gap-1.5 cursor-pointer">
                <Save className="size-3.5" /> {loading ? "Updating Room..." : "Save Changes"}
              </Button>
            </div>

          </form>
        </div>
      </div>
    </div>
  );
}

export default EditRoomPage;
