import jaipurImg from "@/assets/resort_jaipur.png";
import palaceImg from "@/assets/palace_udaipur.png";
import goaImg from "@/assets/beach_goa.png";
import keralaImg from "@/assets/retreat_kerala.png";

// Curated high-resolution photography collections
export const HOTEL_IMAGE_SETS = {
  speshway: {
    main: "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=1200&q=80"
    ]
  },
  udaipur: {
    main: palaceImg,
    gallery: [
      palaceImg,
      "https://images.unsplash.com/photo-1609766857041-ed402ea8069a?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1587474260584-136574528ed5?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80"
    ]
  },
  goa: {
    main: goaImg,
    gallery: [
      goaImg,
      "https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1540541338287-41700207dee6?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=1200&q=80"
    ]
  },
  kerala: {
    main: keralaImg,
    gallery: [
      keralaImg,
      "https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1590073844006-33379778ae09?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=1200&q=80"
    ]
  },
  jaipur: {
    main: jaipurImg,
    gallery: [
      jaipurImg,
      "https://images.unsplash.com/photo-1599661046289-e31897846e41?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1477587458883-47145ed94245?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=1200&q=80"
    ]
  },
  mumbai: {
    main: "https://images.unsplash.com/photo-1570129477492-45c003edd2be?auto=format&fit=crop&w=1200&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1570129477492-45c003edd2be?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=1200&q=80"
    ]
  },
  delhi: {
    main: "https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?auto=format&fit=crop&w=1200&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=1200&q=80"
    ]
  },
  defaultLuxury: {
    main: "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=1200&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=1200&q=80"
    ]
  }
};

// Distinct room category photography
export const ROOM_CATEGORY_IMAGES = {
  standard: [
    "https://images.unsplash.com/photo-1618773928121-c32242e63f39?auto=format&fit=crop&w=1000&q=80",
    "https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1584132967334-10e028bd69f7?auto=format&fit=crop&w=800&q=80"
  ],
  deluxe: [
    "https://images.unsplash.com/photo-1591088398332-8a7791972843?auto=format&fit=crop&w=1000&q=80",
    "https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=800&q=80"
  ],
  suite: [
    "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&w=1000&q=80",
    "https://images.unsplash.com/photo-1578683010236-d716f9a3f461?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=800&q=80"
  ],
  penthouse: [
    "https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=1000&q=80",
    "https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1618773928121-c32242e63f39?auto=format&fit=crop&w=800&q=80"
  ],
  villa: [
    "https://images.unsplash.com/photo-1540541338287-41700207dee6?auto=format&fit=crop&w=1000&q=80",
    "https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=800&q=80"
  ]
};

/**
 * Get distinct primary hotel image
 */
export function getHotelImage(property) {
  if (!property) return HOTEL_IMAGE_SETS.defaultLuxury.main;
  const s = property.settings || {};

  // If valid gallery has uploaded custom hotel image
  if (Array.isArray(s.gallery) && s.gallery.length > 0 && typeof s.gallery[0] === 'string' && s.gallery[0].startsWith('http')) {
    return s.gallery[0];
  }
  if (Array.isArray(s.photos) && s.photos.length > 0 && typeof s.photos[0] === 'string' && s.photos[0].startsWith('http')) {
    return s.photos[0];
  }

  const name = ((s.hotelName || s.name || property.name || "") + " " + (s.city || property.city || "")).toLowerCase();
  const propId = String(property._id || property.id || "").toLowerCase();

  if (name.includes("speshway") || propId.includes("9hq8p") || name.includes("hyderabad") || name.includes("madhapur")) {
    return HOTEL_IMAGE_SETS.speshway.main;
  }
  if (name.includes("udaipur") || name.includes("lake palace") || propId === "hs-uda") {
    return HOTEL_IMAGE_SETS.udaipur.main;
  }
  if (name.includes("goa") || name.includes("candolim") || name.includes("beach") || propId === "hs-goa") {
    return HOTEL_IMAGE_SETS.goa.main;
  }
  if (name.includes("kerala") || name.includes("alleppey") || name.includes("backwater") || propId === "hs-ker") {
    return HOTEL_IMAGE_SETS.kerala.main;
  }
  if (name.includes("jaipur") || name.includes("rambagh") || name.includes("haveli") || propId === "hs-jai") {
    return HOTEL_IMAGE_SETS.jaipur.main;
  }
  if (name.includes("mumbai") || name.includes("marine drive") || propId === "hs-mum") {
    return HOTEL_IMAGE_SETS.mumbai.main;
  }
  if (name.includes("delhi") || name.includes("aerocity") || propId === "hs-del") {
    return HOTEL_IMAGE_SETS.delhi.main;
  }

  return HOTEL_IMAGE_SETS.defaultLuxury.main;
}

/**
 * Get distinct hotel gallery images
 */
export function getHotelGallery(property) {
  if (!property) return HOTEL_IMAGE_SETS.defaultLuxury.gallery;
  const s = property.settings || {};

  const validUploads = (Array.isArray(s.gallery) ? s.gallery : [])
    .concat(Array.isArray(s.photos) ? s.photos : [])
    .filter(img => typeof img === 'string' && img.startsWith('http'));

  if (validUploads.length >= 2) {
    return validUploads;
  }

  const name = ((s.hotelName || s.name || property.name || "") + " " + (s.city || property.city || "")).toLowerCase();
  const propId = String(property._id || property.id || "").toLowerCase();

  if (name.includes("speshway") || propId.includes("9hq8p") || name.includes("hyderabad") || name.includes("madhapur")) {
    return HOTEL_IMAGE_SETS.speshway.gallery;
  }
  if (name.includes("udaipur") || name.includes("lake palace") || propId === "hs-uda") {
    return HOTEL_IMAGE_SETS.udaipur.gallery;
  }
  if (name.includes("goa") || name.includes("candolim") || name.includes("beach") || propId === "hs-goa") {
    return HOTEL_IMAGE_SETS.goa.gallery;
  }
  if (name.includes("kerala") || name.includes("alleppey") || name.includes("backwater") || propId === "hs-ker") {
    return HOTEL_IMAGE_SETS.kerala.gallery;
  }
  if (name.includes("jaipur") || name.includes("rambagh") || name.includes("haveli") || propId === "hs-jai") {
    return HOTEL_IMAGE_SETS.jaipur.gallery;
  }
  if (name.includes("mumbai") || name.includes("marine drive") || propId === "hs-mum") {
    return HOTEL_IMAGE_SETS.mumbai.gallery;
  }
  if (name.includes("delhi") || name.includes("aerocity") || propId === "hs-del") {
    return HOTEL_IMAGE_SETS.delhi.gallery;
  }

  return HOTEL_IMAGE_SETS.defaultLuxury.gallery;
}

/**
 * Get room category-specific photography
 */
export function getRoomCategoryImages(categoryName) {
  const cat = (categoryName || "standard").toLowerCase();
  if (cat.includes("penthouse") || cat.includes("presidential")) {
    return ROOM_CATEGORY_IMAGES.penthouse;
  }
  if (cat.includes("suite") || cat.includes("maharaja") || cat.includes("executive")) {
    return ROOM_CATEGORY_IMAGES.suite;
  }
  if (cat.includes("deluxe") || cat.includes("premier") || cat.includes("delux")) {
    return ROOM_CATEGORY_IMAGES.deluxe;
  }
  if (cat.includes("villa") || cat.includes("cottage") || cat.includes("pool")) {
    return ROOM_CATEGORY_IMAGES.villa;
  }
  return ROOM_CATEGORY_IMAGES.standard;
}

/**
 * Resolve room images for Room Details page
 */
export function getRoomImages(selectedRoom, property) {
  // If specific room has uploaded image array
  if (Array.isArray(selectedRoom?.images) && selectedRoom.images.length > 0) {
    const valid = selectedRoom.images.filter(img => typeof img === 'string' && img.trim().length > 0);
    if (valid.length > 0) return valid;
  }

  const categoryName = selectedRoom?.category || selectedRoom?.name || "Standard Room";
  return getRoomCategoryImages(categoryName);
}
