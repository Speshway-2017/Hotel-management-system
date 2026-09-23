import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Panel } from "@/components/hs/kit";
import { Button } from "@/components/ui/button";
import { FormField, Input, Select } from "@/components/hs/FormFields";
import { toast } from "sonner";
import { Layers, ArrowLeft, Save, Sparkles } from "lucide-react";
import { superAdminService } from "@/services/superAdmin";
import { adminService } from "@/services/admin";
import { validateWithZod, roomTypeSchema } from "@/schemas";

export const Route = createFileRoute("/admin/rooms/add-type")({
  head: () => ({
    meta: [
      { title: "Add Room Type — Speshway Luxury Hotel" },
      { name: "description", content: "Create a new property room category specification." }
    ]
  }),
  component: AddRoomTypePage
});

function AddRoomTypePage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});

  // Form States
  const [category, setCategory] = useState("");
  const [baseRate, setBaseRate] = useState("3000");
  const [occupancy, setOccupancy] = useState("2 Adults");
  const [roomsStr, setRoomsStr] = useState("");
  const [amenitiesStr, setAmenitiesStr] = useState("Air Conditioning, High-speed Wi-Fi, Flat Screen TV");
  const [status, setStatus] = useState("Active");

  const handleSubmit = async (e) => {
    e.preventDefault();

    const val = validateWithZod(roomTypeSchema, {
      category,
      baseRate,
      occupancy
    });

    if (!val.isValid) {
      setFieldErrors(val.errors);
      toast.error(val.firstError);
      return;
    }
    setFieldErrors({});

    const rateNum = Number(baseRate);

    setLoading(true);
    try {
      const assignedRooms = roomsStr
        ? roomsStr.split(",").map(r => r.trim()).filter(Boolean)
        : [];
      
      const amenitiesArr = amenitiesStr
        ? amenitiesStr.split(",").map(a => a.trim()).filter(Boolean)
        : ["Air Conditioning", "Wi-Fi"];

      const newTypeObj = {
        _id: `RT-${Date.now()}`,
        category: category.trim(),
        baseRate: rateNum,
        occupancy: occupancy || "2 Adults",
        rooms: assignedRooms,
        roomsCount: assignedRooms.length || 1,
        activePlans: 1,
        amenities: amenitiesArr,
        status: status || "Active"
      };

      // Load existing room types from MongoDB / LocalStorage
      let existingTypes = [];
      try {
        const settingsRes = await adminService.getPropertySettings().catch(() => ({}));
        const mongoSettings = settingsRes.data || settingsRes || {};
        if (mongoSettings.roomTypes && Array.isArray(mongoSettings.roomTypes)) {
          existingTypes = mongoSettings.roomTypes;
        }
      } catch (err) {}

      if (existingTypes.length === 0) {
        const saved = localStorage.getItem("hms_room_types_list_v2");
        if (saved) {
          try { existingTypes = JSON.parse(saved); } catch (e) {}
        }
      }

      if (existingTypes.length === 0) {
        existingTypes = [
          { _id: "RT-01", category: "Standard Room", rooms: ["101", "102", "103"], roomsCount: 3, occupancy: "2 Adults", baseRate: 3000, activePlans: 1, amenities: ["Air Conditioning", "High-speed Wi-Fi", "Flat Screen TV"], status: "Active" },
          { _id: "RT-02", category: "Deluxe Room", rooms: ["201", "202", "203", "401", "402", "403"], roomsCount: 6, occupancy: "2 Adults + 1 Child", baseRate: 4500, activePlans: 2, amenities: ["Balcony View", "Smart TV", "Room Service", "Mini Bar"], status: "Active" },
          { _id: "RT-03", category: "Executive Suite", rooms: ["301", "302", "303"], roomsCount: 3, occupancy: "4 Adults", baseRate: 6500, activePlans: 2, amenities: ["Jacuzzi Bath", "Living Room", "Espresso Machine", "Airport Transfer"], status: "Active" }
        ];
      }

      // Check if category already exists
      const updatedTypes = [...existingTypes.filter(t => t.category.toLowerCase() !== category.trim().toLowerCase()), newTypeObj];

      // Persist to localStorage & MongoDB
      localStorage.setItem("hms_room_types_list_v2", JSON.stringify(updatedTypes));

      const settingsRes = await adminService.getPropertySettings().catch(() => ({}));
      const currentSettings = settingsRes.data || settingsRes || {};
      await adminService.updatePropertySettings({
        ...currentSettings,
        roomTypes: updatedTypes
      }).catch(() => {});

      const propsRes = await superAdminService.getProperties().catch(() => ({}));
      if (propsRes && propsRes.success && propsRes.data && propsRes.data.length > 0) {
        const prop = propsRes.data[0];
        await superAdminService.updateProperty(prop._id || prop.id, {
          settings: {
            ...(prop.settings || {}),
            roomTypes: updatedTypes
          }
        }).catch(() => {});
      }

      // Also create Room records in MongoDB for assigned room numbers
      for (const num of assignedRooms) {
        try {
          await adminService.createRoom({
            roomNumber: num,
            category: category.trim(),
            status: "Available",
            baseRate: rateNum,
            currentRate: rateNum,
            dailyRate: rateNum,
            floor: `Floor ${num[0] || '1'}`,
            capacity: occupancy || "2 Adults",
            amenities: amenitiesArr
          }).catch(() => {});
        } catch (err) {}
      }

      // Realtime Socket broadcast so Admin, Manager, Receptionist auto-refresh
      import('@/services/socket').then(({ socket }) => {
        try {
          socket.emit('room_status_changed', { action: 'type_added', category: category.trim() });
          socket.emit('booking_updated', { action: 'type_added' });
          socket.emit('availability_changed', { action: 'type_added' });
        } catch (e) {}
      }).catch(() => {});

      toast.success(`Room Type "${category.trim()}" created successfully!`);
      navigate({ to: "/admin/rooms" });
    } catch (err) {
      toast.error(err.message || "Failed to create Room Type.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 text-left font-sans animate-fade-in font-ui">
      <div className="max-w-2xl">
        <Panel title="Room Type Specifications Form" description="Assign operational category parameters and room allocations.">
          <form onSubmit={handleSubmit} className="p-6 space-y-4 bg-white rounded-b-xl">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField label="Category Name" required className="col-span-2" id="category" status={fieldErrors.category ? "error" : undefined} errorMsg={fieldErrors.category}>
                <Input
                  id="category"
                  type="text"
                  required
                  value={category}
                  onChange={(e) => {
                    setCategory(e.target.value);
                    if (fieldErrors.category) setFieldErrors(p => ({ ...p, category: null }));
                  }}
                  placeholder="e.g. Penthouse Suite, Royal Ocean Villa, Superior Deluxe"
                />
              </FormField>

              <FormField label="Base Tariff (₹)" required id="baseRate" status={fieldErrors.baseRate || fieldErrors.basePrice ? "error" : undefined} errorMsg={fieldErrors.baseRate || fieldErrors.basePrice}>
                <Input
                  id="baseRate"
                  type="number"
                  required
                  value={baseRate}
                  onChange={(e) => {
                    setBaseRate(e.target.value);
                    if (fieldErrors.baseRate || fieldErrors.basePrice) {
                      setFieldErrors(p => ({ ...p, baseRate: null, basePrice: null }));
                    }
                  }}
                  placeholder="3000"
                  suffix="₹"
                />
              </FormField>

              <FormField label="Max Occupancy" required id="occupancy">
                <Input
                  id="occupancy"
                  type="text"
                  required
                  value={occupancy}
                  onChange={(e) => setOccupancy(e.target.value)}
                  placeholder="e.g. 2 Adults + 1 Child"
                />
              </FormField>

              <FormField label="Assigned Room Numbers (comma-separated)" className="col-span-2" id="roomsStr">
                <Input
                  id="roomsStr"
                  type="text"
                  value={roomsStr}
                  onChange={(e) => setRoomsStr(e.target.value)}
                  placeholder="e.g. 501, 502, 503"
                />
              </FormField>

              <FormField label="Category Amenities (comma-separated)" className="col-span-2" id="amenitiesStr">
                <Input
                  id="amenitiesStr"
                  type="text"
                  value={amenitiesStr}
                  onChange={(e) => setAmenitiesStr(e.target.value)}
                  placeholder="e.g. Air Conditioning, High-speed Wi-Fi, Jacuzzi, Balcony"
                />
              </FormField>

              <FormField label="Operational Status" id="status">
                <Select
                  id="status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </Select>
              </FormField>
            </div>

            <div className="pt-5 border-t border-muted flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => navigate({ to: "/admin/rooms" })}
                className="h-10 px-5 text-xs font-bold rounded-full"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="bg-navy hover:bg-navy-deep text-white h-10 px-6 text-xs font-bold rounded-full cursor-pointer flex items-center gap-1.5"
              >
                <Save className="size-4" /> {loading ? "Creating..." : "Save Room Type"}
              </Button>
            </div>
          </form>
        </Panel>
      </div>
    </div>
  );
}
