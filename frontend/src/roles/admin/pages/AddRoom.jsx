import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader, Panel, Crumbs } from "@/components/hs/kit";
import { Button } from "@/components/ui/button";
import { FormField, Input, Select } from "@/components/hs/FormFields";
import { toast } from "sonner";
import { Bed, ArrowLeft, Plus } from "lucide-react";

export const Route = createFileRoute("/admin/rooms/add")({
  head: () => ({
    meta: [
      { title: "Add Room — Speshway Luxury Hotel" }
    ]
  }),
  component: AddRoomPage
});

import { superAdminService } from "@/services/superAdmin";
import { adminService } from "@/services/admin";
import { useEffect } from "react";

function AddRoomPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [properties, setProperties] = useState([]);

  // Load existing room types from database
  const [roomTypes, setRoomTypes] = useState([
    { category: "Villa Suite", baseRate: 38900, occupancy: "4 Adults", amenities: "Private infinity pool, Plunge deck, Open-air shower" },
    { category: "Maharaja Suite", baseRate: 24500, occupancy: "2 Adults + 1 Child", amenities: "Private Jacuzzi, Royal balcony view, Butler service" },
    { category: "Heritage Luxury", baseRate: 11400, occupancy: "2 Adults", amenities: "Heritage furnishings, Garden facing, Coffee station" },
    { category: "Superior Deluxe", baseRate: 8500, occupancy: "2 Adults", amenities: "Courtyard facing, Smart TV, Mini espresso station" }
  ]);

  // Form Fields States
  const [roomNumber, setRoomNumber] = useState("");
  const [selectedType, setSelectedType] = useState("Villa Suite");
  const [floor, setFloor] = useState("Floor 1");
  const [capacity, setCapacity] = useState("4 Adults");
  const [bedType, setBedType] = useState("King Bed");
  const [amenities, setAmenities] = useState("Private infinity pool, Plunge deck, Open-air shower");
  const [baseRate, setBaseRate] = useState("38900");
  const [status, setStatus] = useState("Available");
  const [description, setDescription] = useState("");

  // Custom Category Fields
  const [newTypeName, setNewTypeName] = useState("");
  const [newTypeRate, setNewTypeRate] = useState("");
  const [newTypeOccupancy, setNewTypeOccupancy] = useState("2 Adults");
  const [newTypeAmenities, setNewTypeAmenities] = useState("");

  useEffect(() => {
    async function init() {
      try {
        const res = await superAdminService.getProperties();
        if (res.success && res.data && res.data.length > 0) {
          setProperties(res.data);
          const settings = res.data[0].settings || {};
          if (settings.roomTypes) {
            setRoomTypes(settings.roomTypes);
          }
        }
      } catch (err) {}
    }
    init();
  }, []);

  // Automatically sync rate and capacity if predefined category is chosen
  const handleTypeChange = (e) => {
    const typeVal = e.target.value;
    setSelectedType(typeVal);

    if (typeVal !== "new") {
      const matched = roomTypes.find(t => t.category === typeVal);
      if (matched) {
        setBaseRate(matched.baseRate.toString());
        setCapacity(matched.occupancy);
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

    setLoading(true);

    try {
      let finalCategory = selectedType;
      let finalRate = Number(baseRate);

      // If "Create New Room Type" selected
      if (selectedType === "new") {
        if (!newTypeName || !newTypeRate) {
          toast.error("Category name and Base Rate are required for new room types.");
          setLoading(false);
          return;
        }

        finalCategory = newTypeName.trim();
        finalRate = Number(newTypeRate);

        // Add to roomTypes list
        const newCategoryObj = {
          _id: `T-${Date.now()}`,
          category: finalCategory,
          roomsCount: 1,
          occupancy: newTypeOccupancy,
          baseRate: finalRate,
          activePlans: 2,
          amenities: newTypeAmenities ? newTypeAmenities.split(",").map(a => a.trim()) : ["Free Wi-Fi"],
          status: "Active"
        };

        const updatedTypes = [...roomTypes, newCategoryObj];
        
        // Save to properties GDS mappings settings
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

      // Add to roomsList database collection
      await adminService.createRoom({
        roomNumber,
        category: finalCategory,
        status: status || 'Available'
      });

      toast.success(`Room #${roomNumber} registered successfully!`);
      navigate({ to: "/admin/rooms" });

    } catch (err) {
      toast.error(err.message || "Failed to add room key");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 text-left font-sans animate-fade-in font-ui">
      <div className="space-y-3.5">
        <Crumbs items={[
          { label: "Workspace", to: "/admin" },
          { label: "Rooms & Rates", to: "/admin/rooms" },
          { label: "Add Room" }
        ]} />
        <PageHeader
          title="Add New Room Key"
          subtitle="Configure a new room inventory record mapping physical keys, bed layouts, and standard BAR values."
        />
      </div>

      <div className="max-w-2xl">
        <Panel title="Room Configuration Form" description="Assign inventory slots, bed layouts, pricing plans and sync status.">
          <form onSubmit={handleSubmit} className="p-6 space-y-5 bg-white rounded-b-xl">
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Room Number" required id="roomNumber">
                <Input
                  id="roomNumber"
                  type="text"
                  required
                  placeholder="e.g. 109"
                  value={roomNumber}
                  onChange={(e) => setRoomNumber(e.target.value)}
                />
              </FormField>

              <FormField label="Room Category Type" required id="roomType">
                <Select
                  id="roomType"
                  value={selectedType}
                  onChange={handleTypeChange}
                  className="font-bold text-xs h-10"
                >
                  {roomTypes.map(t => (
                    <option key={t.category} value={t.category}>{t.category}</option>
                  ))}
                  <option value="new">+ Create New Room Type</option>
                </Select>
              </FormField>
            </div>

            {/* Custom Room Type inline fields */}
            {selectedType === "new" && (
              <div className="p-4 bg-muted/15 border border-muted rounded-xl space-y-4 animate-fade-in">
                <h4 className="text-xs font-bold text-navy-deep uppercase border-b border-muted/30 pb-2">New Category Registry</h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField label="New Category Name" required id="newTypeName">
                    <Input
                      id="newTypeName"
                      placeholder="e.g. Deluxe Suite Villa"
                      value={newTypeName}
                      onChange={(e) => setNewTypeName(e.target.value)}
                    />
                  </FormField>
                  <FormField label="Base Rate (₹)" required id="newTypeRate">
                    <Input
                      id="newTypeRate"
                      type="number"
                      placeholder="e.g. 16500"
                      value={newTypeRate}
                      onChange={(e) => setNewTypeRate(e.target.value)}
                    />
                  </FormField>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField label="Capacity" id="newTypeOccupancy">
                    <Select
                      id="newTypeOccupancy"
                      value={newTypeOccupancy}
                      onChange={(e) => setNewTypeOccupancy(e.target.value)}
                      className="font-bold text-xs h-10"
                    >
                      <option value="2 Adults">2 Adults</option>
                      <option value="2 Adults + 1 Child">2 Adults + 1 Child</option>
                      <option value="4 Adults">4 Adults</option>
                    </Select>
                  </FormField>
                  <FormField label="Category Amenities (comma separated)" id="newTypeAmenities">
                    <Input
                      id="newTypeAmenities"
                      placeholder="e.g. King Bed, Sea view, Jacuzzi"
                      value={newTypeAmenities}
                      onChange={(e) => setNewTypeAmenities(e.target.value)}
                    />
                  </FormField>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Floor Mapping" required id="floor">
                <Select
                  id="floor"
                  value={floor}
                  onChange={(e) => setFloor(e.target.value)}
                  className="font-bold text-xs h-10"
                >
                  <option value="Floor 1">Floor 1</option>
                  <option value="Floor 2">Floor 2</option>
                  <option value="Floor 3">Floor 3</option>
                </Select>
              </FormField>

              <FormField label="Standard Capacity" required id="capacity">
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
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

              <FormField label="Base Rate (₹)" required id="baseRate">
                <Input
                  id="baseRate"
                  type="number"
                  required
                  placeholder="e.g. 12000"
                  value={baseRate}
                  onChange={(e) => setBaseRate(e.target.value)}
                  disabled={selectedType !== "new"}
                />
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Initial Operational Status" required id="status">
                <Select
                  id="status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="font-bold text-xs h-10"
                >
                  <option value="Available">Available (Vacant Clean)</option>
                  <option value="Dirty">Dirty ( Housekeeping turnaround )</option>
                  <option value="Blocked">Blocked ( Precheck hold )</option>
                  <option value="Out of Order">Out of Order ( Maintenance )</option>
                </Select>
              </FormField>
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

            <div className="pt-4 border-t border-muted/40 flex justify-end gap-2.5 select-none">
              <Button
                type="button"
                variant="ghost"
                className="h-10 text-xs px-5 rounded-full"
                onClick={() => navigate({ to: "/admin/rooms" })}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="bg-navy hover:bg-navy-deep text-white text-xs h-10 px-6 font-bold rounded-full shadow-soft"
              >
                {loading ? "Adding Room..." : "Create Room Key"}
              </Button>
            </div>

          </form>
        </Panel>
      </div>
    </div>
  );
}
