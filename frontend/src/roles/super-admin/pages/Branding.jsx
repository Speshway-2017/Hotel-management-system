import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageHeader, Panel, Tag, Notice, LoadingRows } from "@/components/hs/kit";
import { brandingService } from "@/services/branding";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Save,
  RotateCcw,
  Sparkles,
  Globe,
  FileText,
  Building2,
  Phone,
  HelpCircle,
  X,
  Trash2,
  Edit2,
  Plus,
  Eye,
  AlertTriangle,
  UploadCloud,
  Check
} from "lucide-react";

// Sliding Toggle Switch Component
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

function SuperAdminBranding() {
  const [activeTab, setActiveTab] = useState("branding");
  const [cmsItems, setCmsItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Modals States
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState("add_blog"); // "add_blog" | "edit_blog" | "add_feature" | "edit_feature" | "delete"
  const [selectedItem, setSelectedItem] = useState(null);

  // Database CMS configurations
  const [dbBranding, setDbBranding] = useState({
    id: "",
    name: "Hour Stay",
    tagline: "Hospitality software from Jaipur",
    logoUrl: "/assets/logo-Bk15F6S5.png",
    faviconUrl: "/favicon.ico",
    primaryColor: "#0D1B2A",
    secondaryColor: "#5B21B6"
  });

  const [dbHome, setDbHome] = useState({
    id: "",
    title: "Built for the way Indian hospitality works.",
    excerpt: "We believe in technology that respects the hustle behind the desk. Hour Stay is engineered to simplify operations, remove dashboard clutter, and streamline guest management.",
    author: "Start Free Trial", // CTA Text
    tag: "Heritage properties, city boutique hotels, and resorts.", // Featured Content info
    content: "/assets/palace_udaipur-CU7rhatd.png", // Hero image
    enableFeatured: true,
    enableHero: true
  });

  const [dbAbout, setDbAbout] = useState({
    id: "",
    title: "Built for the way Indian hospitality works.",
    excerpt: "Hour Stay is a unified, cloud-based Hotel Management System that connects reservations, front desk check-in/out, GST billing, housekeeping tasks, guest mobile apps, and analytics in one cohesive platform.",
    author: "Hour Stay began with a simple observation: most hotel management software is too complicated. Properties were forced to juggle separate systems. We set out to rebuild this stack from scratch.", // story
    tag: "To empower Indian hoteliers with modern, reliable, and intuitive cloud technology to run smooth daily check-ins.", // mission
    role: "To be the preferred core PMS system across 5,000+ boutique, heritage, and independent hotels in South Asia.", // vision
    content: "/assets/palace_udaipur-CU7rhatd.png" // Image
  });

  const [dbContact, setDbContact] = useState({
    id: "",
    name: "Hour Stay Headquarters",
    email: "contact@hourstay.com",
    phone: "+91 141 220 9900",
    address: "Hour Stay HQ, Heritage Plaza, Malviya Nagar, Jaipur, Rajasthan 302017",
    hours: "Mon - Sat: 09:00 AM - 06:00 PM IST",
    description: "Our support engineers are available for phone check-ins during working hours. Reach out for deployment queries.",
    subject: "Jaipur, Rajasthan, India", // Map coordinates/info
    message: "https://twitter.com/hourstay, https://linkedin.com/company/hourstay" // Social links CSV
  });

  // Active form inputs states
  const [brandingForm, setBrandingForm] = useState({ ...dbBranding });
  const [homeForm, setHomeForm] = useState({ ...dbHome });
  const [aboutForm, setAboutForm] = useState({ ...dbAbout });
  const [contactForm, setContactForm] = useState({ ...dbContact });

  // Modal forms
  const [blogForm, setBlogForm] = useState({
    title: "",
    slug: "",
    excerpt: "",
    author: "Super Admin",
    role: "Hour Stay Group",
    tag: "Hotel Management",
    readTime: "5 min read",
    content: "",
    status: "Published", // "Published" | "Draft"
    description: "",
    imageUrl: "",
    imagePublicId: ""
  });

  const [featureForm, setFeatureForm] = useState({
    title: "",
    excerpt: "",
    icon: "Building2",
    tag: "", // points
    status: "Active" // "Active" | "Inactive"
  });

  const loadCms = async () => {
    setLoading(true);
    try {
      const res = await brandingService.getCmsItems();
      if (res.success) {
        setCmsItems(res.data);
        
        const brandingConfig = res.data.find(item => item.type === "branding");
        if (brandingConfig) {
          const mapped = {
            id: brandingConfig.id || brandingConfig._id,
            name: brandingConfig.name || "Hour Stay",
            tagline: brandingConfig.tag || "",
            logoUrl: brandingConfig.content || "",
            faviconUrl: brandingConfig.readTime || "",
            primaryColor: brandingConfig.author || "",
            secondaryColor: brandingConfig.role || ""
          };
          setDbBranding(mapped);
          setBrandingForm(mapped);
        }
        
        const homeConfig = res.data.find(item => item.type === "home");
        if (homeConfig) {
          const parsedContent = homeConfig.content || "";
          const mapped = {
            id: homeConfig.id || homeConfig._id,
            title: homeConfig.title || "",
            excerpt: homeConfig.excerpt || "",
            author: homeConfig.author || "",
            tag: homeConfig.tag || "",
            content: parsedContent,
            enableFeatured: homeConfig.status !== "Inactive",
            enableHero: true
          };
          setDbHome(mapped);
          setHomeForm(mapped);
        }
        
        const aboutConfig = res.data.find(item => item.type === "about");
        if (aboutConfig) {
          const mapped = {
            id: aboutConfig.id || aboutConfig._id,
            title: aboutConfig.title || "",
            excerpt: aboutConfig.excerpt || "",
            author: aboutConfig.author || "",
            tag: aboutConfig.tag || "",
            role: aboutConfig.role || "",
            content: aboutConfig.content || ""
          };
          setDbAbout(mapped);
          setAboutForm(mapped);
        }
        
        const contactConfig = res.data.find(item => item.type === "contact" && (item.id === "cms_contact_config" || item._id === "cms_contact_config" || item.name));
        if (contactConfig) {
          const mapped = {
            id: contactConfig.id || contactConfig._id,
            name: contactConfig.name || "",
            email: contactConfig.email || "",
            phone: contactConfig.phone || "",
            address: contactConfig.address || "",
            hours: contactConfig.hours || "",
            description: contactConfig.description || "",
            subject: contactConfig.subject || "",
            message: contactConfig.message || ""
          };
          setDbContact(mapped);
          setContactForm(mapped);
        }
      }
    } catch (err) {
      toast.error(err.message || "Failed to load branding assets.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCms();
  }, []);

  // Determine if active tab form has changes
  const checkHasChanges = () => {
    if (activeTab === "branding") return JSON.stringify(brandingForm) !== JSON.stringify(dbBranding);
    if (activeTab === "home") return JSON.stringify(homeForm) !== JSON.stringify(dbHome);
    if (activeTab === "about") return JSON.stringify(aboutForm) !== JSON.stringify(dbAbout);
    if (activeTab === "contact") return JSON.stringify(contactForm) !== JSON.stringify(dbContact);
    return false;
  };

  const hasChanges = checkHasChanges();

  const handleDiscardChanges = () => {
    if (activeTab === "branding") setBrandingForm({ ...dbBranding });
    if (activeTab === "home") setHomeForm({ ...dbHome });
    if (activeTab === "about") setAboutForm({ ...dbAbout });
    if (activeTab === "contact") setContactForm({ ...dbContact });
    toast.info("Content changes rolled back.");
  };

  const handleUpdateSection = async (e) => {
    if (e) e.preventDefault();
    setSaving(true);
    try {
      let res;
      let payload = {};
      let type = activeTab;
      let id = "";

      if (activeTab === "branding") {
        id = brandingForm.id;
        payload = {
          name: brandingForm.name,
          tag: brandingForm.tagline,
          content: brandingForm.logoUrl,
          readTime: brandingForm.faviconUrl,
          author: brandingForm.primaryColor,
          role: brandingForm.secondaryColor
        };
      } else if (activeTab === "home") {
        id = homeForm.id;
        payload = {
          title: homeForm.title,
          excerpt: homeForm.excerpt,
          author: homeForm.author,
          tag: homeForm.tag,
          content: homeForm.content,
          status: homeForm.enableFeatured ? "Active" : "Inactive"
        };
      } else if (activeTab === "about") {
        id = aboutForm.id;
        payload = {
          title: aboutForm.title,
          excerpt: aboutForm.excerpt,
          author: aboutForm.author,
          tag: aboutForm.tag,
          role: aboutForm.role,
          content: aboutForm.content
        };
      } else if (activeTab === "contact") {
        id = contactForm.id;
        payload = {
          name: contactForm.name,
          email: contactForm.email,
          phone: contactForm.phone,
          address: contactForm.address,
          hours: contactForm.hours,
          description: contactForm.description,
          subject: contactForm.subject,
          message: contactForm.message
        };
      }

      if (id) {
        if (activeTab === "branding") {
          res = await brandingService.updateBranding(id, payload);
        } else if (activeTab === "home") {
          res = await brandingService.updateHome(id, payload);
        } else if (activeTab === "about") {
          res = await brandingService.updateAbout(id, payload);
        } else if (activeTab === "contact") {
          res = await brandingService.updateContact(id, payload);
        }
      } else {
        res = await brandingService.createCmsItem({ type, ...payload });
      }

      if (res.success) {
        toast.success(`Branding section [${type.toUpperCase()}] updated live!`);
        loadCms();
      }
    } catch (err) {
      toast.error(err.message || "Failed to update branding settings");
    } finally {
      setSaving(false);
    }
  };

  // Real Image upload handler using backend upload route
  const triggerImageUpload = (setter, formState, key, assetName) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      if (file.size > 5 * 1024 * 1024) {
        return toast.error("File size exceeds 5MB limit.");
      }

      const allowedExts = ["jpg", "jpeg", "png", "webp"];
      const fileExt = file.name.split(".").pop().toLowerCase();
      if (!allowedExts.includes(fileExt)) {
        return toast.error("Invalid image format. Allowed formats: JPG, JPEG, PNG, WEBP");
      }

      setUploading(true);
      const formData = new FormData();
      formData.append("image", file);

      toast.loading(`Uploading ${assetName} to server...`);
      try {
        const token = localStorage.getItem("hms_token");
        const res = await fetch("http://localhost:5000/api/super-admin/upload", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${token}`
          },
          body: formData
        });
        const data = await res.json();
        toast.dismiss();
        if (data.success && data.data) {
          setter({
            ...formState,
            [key + "Url"]: data.data.url,
            content: key === "hero" || key === "about" ? data.data.url : formState.content,
            description: key === "blog" ? data.data.url : formState.description,
            imageUrl: key === "blog" ? data.data.url : formState.imageUrl,
            imagePublicId: key === "blog" ? data.data.publicId : formState.imagePublicId
          });
          toast.success(`${assetName} uploaded successfully!`);
        } else {
          toast.error(data.message || "Upload failed");
        }
      } catch (err) {
        toast.dismiss();
        toast.error("Upload error: " + err.message);
      } finally {
        setUploading(false);
      }
    };
    input.click();
  };

  // Features CRUD
  const handleFeatureSubmit = async (e) => {
    e.preventDefault();
    try {
      if (modalType === "add_feature") {
        const res = await brandingService.createFeature(featureForm);
        if (res.success) {
          setModalOpen(false);
          toast.success("Feature added successfully.");
          loadCms();
        }
      } else if (modalType === "edit_feature") {
        const res = await brandingService.updateFeature(selectedItem.id || selectedItem._id, featureForm);
        if (res.success) {
          setModalOpen(false);
          toast.success("Feature updated.");
          loadCms();
        }
      }
    } catch (err) {
      toast.error(err.message || "Failed to save feature");
    }
  };

  // Blogs CRUD
  const handleBlogSubmit = async (e) => {
    e.preventDefault();
    try {
      if (modalType === "add_blog") {
        const res = await brandingService.createBlog(blogForm);
        if (res.success) {
          setModalOpen(false);
          toast.success("Blog article drafted.");
          loadCms();
        }
      } else if (modalType === "edit_blog") {
        const res = await brandingService.updateBlog(selectedItem.id || selectedItem._id, blogForm);
        if (res.success) {
          setModalOpen(false);
          toast.success("Blog article updated.");
          loadCms();
        }
      }
    } catch (err) {
      toast.error(err.message || "Failed to save article");
    }
  };

  const openDeleteModal = (item, type) => {
    setSelectedItem(item);
    setModalType(`delete_${type}`);
    setModalOpen(true);
  };

  const confirmDelete = async () => {
    try {
      let res;
      const targetId = selectedItem.id || selectedItem._id;
      if (modalType === "delete_feature") {
        res = await brandingService.deleteFeature(targetId);
      } else {
        res = await brandingService.deleteBlog(targetId);
      }
      if (res.success) {
        setModalOpen(false);
        toast.success("Item removed from database.");
        loadCms();
      }
    } catch (err) {
      toast.error(err.message || "Delete operation failed");
    }
  };

  const handlePreviewPage = (path) => {
    window.open("http://localhost:5173" + path, "_blank");
  };

  const blogs = cmsItems.filter(item => item.type === "blog");
  const features = cmsItems.filter(item => item.type === "feature");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Branding & CMS Engine"
        subtitle="Manage public marketing pages copy, brand assets, dynamic feature cards, and blog posts."
      />

      {hasChanges && (
        <div className="flex items-center justify-between bg-gold/10 border border-gold/30 rounded-xl p-4 text-navy font-semibold text-xs sm:text-sm animate-fade-in text-left">
          <div className="flex items-center gap-2">
            <AlertTriangle className="size-4.5 text-gold shrink-0" />
            <span>You have unsaved edits in section <strong>{activeTab.toUpperCase()}</strong>. These will not be reflected on the public pages until saved.</span>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleDiscardChanges} variant="ghost" className="h-8 rounded-full text-xs font-semibold">
              <RotateCcw className="size-3 mr-1" /> Reset
            </Button>
            <Button onClick={handleUpdateSection} disabled={saving} className="bg-navy hover:bg-navy/90 text-cream h-8 rounded-full text-xs font-semibold gap-1">
              <Save className="size-3" /> Save Section
            </Button>
          </div>
        </div>
      )}

      {/* Split settings layout grid */}
      <div className="grid gap-6 lg:grid-cols-[220px_1fr] items-start">
        
        {/* Left branding navigation category sub-sidebar (Sticky) */}
        <div className="sticky top-6 space-y-1 bg-white border border-navy/5 rounded-xl p-3 shadow-soft text-left">
          <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/80 border-b mb-2">
            Branding Section
          </p>
          {[
            { id: "branding", label: "Brand Identity", icon: Sparkles },
            { id: "home", label: "Home Page Copy", icon: Globe },
            { id: "about", label: "About Section", icon: FileText },
            { id: "features", label: "Features List", icon: Building2 },
            { id: "blogs", label: "Blog Roll List", icon: FileText },
            { id: "contact", label: "Contact Details", icon: Phone }
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

        {/* Right main panel workspace form content */}
        <div className="space-y-6">
          
          {loading ? (
            <LoadingRows rows={5} />
          ) : (
            <div className="space-y-6">
              
              {/* SECTION 1: Brand Identity */}
              {activeTab === "branding" && (
                <Panel 
                  title="Global Brand Identity" 
                  description="Configure basic branding parameters, logo path assets, shortcuts and colors."
                  actions={
                    <Button onClick={() => handlePreviewPage("/")} variant="outline" size="sm" className="rounded-full text-xs font-semibold gap-1.5 hover:bg-muted text-navy border-muted">
                      <Eye className="size-4" /> Live Site Preview
                    </Button>
                  }
                >
                  <form onSubmit={handleUpdateSection} className="p-5 space-y-4 text-left">
                    <div className="flex gap-6 items-start border-b pb-4">
                      <div className="space-y-1">
                        <Label className="text-xs text-navy font-semibold">Active Logo Preview</Label>
                        <div className="size-16 rounded-xl border bg-cream/35 flex items-center justify-center p-2 shadow-soft">
                          {brandingForm.logoUrl ? (
                            <img src={brandingForm.logoUrl} alt="Logo" className="w-full h-full object-contain" />
                          ) : (
                            <span className="text-[10px] text-muted-foreground">No Logo</span>
                          )}
                        </div>
                      </div>
                      <div className="flex-1 space-y-2">
                        <Label htmlFor="brand-logo" className="text-xs text-navy font-semibold">Logo URL/Asset Path</Label>
                        <div className="flex gap-2">
                          <Input
                            id="brand-logo"
                            value={brandingForm.logoUrl}
                            onChange={(e) => setBrandingForm({ ...brandingForm, logoUrl: e.target.value })}
                            className="h-10 text-xs bg-white"
                          />
                          <Button 
                            type="button" 
                            onClick={() => triggerImageUpload(setBrandingForm, brandingForm, "logo", "brand logo")}
                            className="bg-navy hover:bg-navy/90 text-white rounded-md h-10 gap-1 text-xs"
                          >
                            <UploadCloud className="size-4" /> Upload
                          </Button>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <Label htmlFor="brand-name" className="text-xs text-navy font-semibold">Brand Name</Label>
                        <Input
                          id="brand-name"
                          value={brandingForm.name}
                          onChange={(e) => setBrandingForm({ ...brandingForm, name: e.target.value })}
                          className="h-10 text-xs bg-white"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="brand-tagline" className="text-xs text-navy font-semibold">Tagline Summary</Label>
                        <Input
                          id="brand-tagline"
                          value={brandingForm.tagline}
                          onChange={(e) => setBrandingForm({ ...brandingForm, tagline: e.target.value })}
                          className="h-10 text-xs bg-white"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-1">
                        <Label htmlFor="brand-favicon" className="text-xs text-navy font-semibold">Favicon Asset Icon URL</Label>
                        <Input
                          id="brand-favicon"
                          value={brandingForm.faviconUrl}
                          onChange={(e) => setBrandingForm({ ...brandingForm, faviconUrl: e.target.value })}
                          className="h-10 text-xs bg-white"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="brand-primary" className="text-xs text-navy font-semibold">Primary Hex Color</Label>
                        <div className="flex gap-2">
                          <Input
                            id="brand-primary"
                            value={brandingForm.primaryColor}
                            onChange={(e) => setBrandingForm({ ...brandingForm, primaryColor: e.target.value })}
                            className="h-10 text-xs bg-white font-mono"
                          />
                          <div className="size-10 rounded border shrink-0" style={{ backgroundColor: brandingForm.primaryColor }} />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="brand-secondary" className="text-xs text-navy font-semibold">Secondary Hex Color</Label>
                        <div className="flex gap-2">
                          <Input
                            id="brand-secondary"
                            value={brandingForm.secondaryColor}
                            onChange={(e) => setBrandingForm({ ...brandingForm, secondaryColor: e.target.value })}
                            className="h-10 text-xs bg-white font-mono"
                          />
                          <div className="size-10 rounded border shrink-0" style={{ backgroundColor: brandingForm.secondaryColor }} />
                        </div>
                      </div>
                    </div>
                  </form>
                </Panel>
              )}

              {/* SECTION 2: Home Page */}
              {activeTab === "home" && (
                <Panel 
                  title="Home Page Hero Copy" 
                  description="Manage hero descriptions, CTA labels, and backdrop assets."
                  actions={
                    <Button onClick={() => handlePreviewPage("/")} variant="outline" size="sm" className="rounded-full text-xs font-semibold gap-1.5 hover:bg-muted text-navy border-muted">
                      <Eye className="size-4" /> Live Page Preview
                    </Button>
                  }
                >
                  <form onSubmit={handleUpdateSection} className="p-5 space-y-4 text-left">
                    <ToggleSwitch
                      checked={homeForm.enableFeatured}
                      onChange={(val) => setHomeForm({ ...homeForm, enableFeatured: val })}
                      label="Display Core Services Quick Search Card"
                      description="Toggle the visibility of the destination check-in search inputs card on the hero slider banner."
                    />

                    <div className="space-y-1">
                      <Label htmlFor="home-title" className="text-xs text-navy font-semibold">Hero Heading</Label>
                      <Input
                        id="home-title"
                        value={homeForm.title}
                        onChange={(e) => setHomeForm({ ...homeForm, title: e.target.value })}
                        className="h-10 text-xs bg-white"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="home-excerpt" className="text-xs text-navy font-semibold">Hero Description Copy</Label>
                      <Textarea
                        id="home-excerpt"
                        value={homeForm.excerpt}
                        onChange={(e) => setHomeForm({ ...homeForm, excerpt: e.target.value })}
                        className="min-h-[90px] text-xs resize-none bg-white"
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <Label htmlFor="home-cta" className="text-xs text-navy font-semibold">CTA Button Label</Label>
                        <Input
                          id="home-cta"
                          value={homeForm.author}
                          onChange={(e) => setHomeForm({ ...homeForm, author: e.target.value })}
                          className="h-10 text-xs bg-white"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="home-tag" className="text-xs text-navy font-semibold">Featured Properties Summary</Label>
                        <Input
                          id="home-tag"
                          value={homeForm.tag}
                          onChange={(e) => setHomeForm({ ...homeForm, tag: e.target.value })}
                          className="h-10 text-xs bg-white"
                        />
                      </div>
                    </div>

                    <div className="flex gap-4 items-end">
                      <div className="flex-1 space-y-1">
                        <Label htmlFor="home-content" className="text-xs text-navy font-semibold">Hero Image Asset Path</Label>
                        <Input
                          id="home-content"
                          value={homeForm.content}
                          onChange={(e) => setHomeForm({ ...homeForm, content: e.target.value })}
                          className="h-10 text-xs bg-white"
                        />
                      </div>
                      <Button
                        type="button"
                        onClick={() => triggerImageUpload(setHomeForm, homeForm, "hero", "hero image")}
                        className="bg-navy hover:bg-navy/90 text-white h-10 gap-1 rounded-md text-xs"
                      >
                        <UploadCloud className="size-4" /> Upload Hero
                      </Button>
                    </div>

                    {homeForm.content && (
                      <div className="mt-4 border rounded-xl overflow-hidden max-w-md bg-muted/20 animate-fade-in shadow-soft">
                        <img src={homeForm.content} alt="Hero banner preview" className="w-full h-44 object-cover" />
                      </div>
                    )}
                  </form>
                </Panel>
              )}

              {/* SECTION 3: About Page */}
              {activeTab === "about" && (
                <Panel 
                  title="About page copy details" 
                  description="Configure company profiles narrative, stories, vision and mission statements."
                  actions={
                    <Button onClick={() => handlePreviewPage("/about")} variant="outline" size="sm" className="rounded-full text-xs font-semibold gap-1.5 hover:bg-muted text-navy border-muted">
                      <Eye className="size-4" /> Live Page Preview
                    </Button>
                  }
                >
                  <form onSubmit={handleUpdateSection} className="p-5 space-y-4 text-left">
                    <div className="space-y-1">
                      <Label htmlFor="about-title" className="text-xs text-navy font-semibold">Page Title Header</Label>
                      <Input
                        id="about-title"
                        value={aboutForm.title}
                        onChange={(e) => setAboutForm({ ...aboutForm, title: e.target.value })}
                        className="h-10 text-xs bg-white"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="about-desc" className="text-xs text-navy font-semibold">Brief Summary description</Label>
                      <Textarea
                        id="about-desc"
                        value={aboutForm.excerpt}
                        onChange={(e) => setAboutForm({ ...aboutForm, excerpt: e.target.value })}
                        className="min-h-[80px] text-xs resize-none bg-white"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="about-story" className="text-xs text-navy font-semibold">Hotel Narrative Story (Split paragraphs with double newline)</Label>
                      <Textarea
                        id="about-story"
                        value={aboutForm.author}
                        onChange={(e) => setAboutForm({ ...aboutForm, author: e.target.value })}
                        className="min-h-[160px] text-xs bg-white"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <Label htmlFor="about-mission" className="text-xs text-navy font-semibold">Corporate Mission Statement</Label>
                        <Textarea
                          id="about-mission"
                          value={aboutForm.tag}
                          onChange={(e) => setAboutForm({ ...aboutForm, tag: e.target.value })}
                          className="min-h-[80px] text-xs resize-none bg-white"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="about-vision" className="text-xs text-navy font-semibold">Corporate Vision Statement</Label>
                        <Textarea
                          id="about-vision"
                          value={aboutForm.role}
                          onChange={(e) => setAboutForm({ ...aboutForm, role: e.target.value })}
                          className="min-h-[80px] text-xs resize-none bg-white"
                        />
                      </div>
                    </div>

                    <div className="flex gap-4 items-end">
                      <div className="flex-1 space-y-1">
                        <Label htmlFor="about-img" className="text-xs text-navy font-semibold">Featured Resort Image Path</Label>
                        <Input
                          id="about-img"
                          value={aboutForm.content}
                          onChange={(e) => setAboutForm({ ...aboutForm, content: e.target.value })}
                          className="h-10 text-xs bg-white"
                        />
                      </div>
                      <Button
                        type="button"
                        onClick={() => triggerImageUpload(setAboutForm, aboutForm, "about", "about image")}
                        className="bg-navy hover:bg-navy/90 text-white h-10 gap-1 rounded-md text-xs font-semibold"
                      >
                        <UploadCloud className="size-4" /> Upload
                      </Button>
                    </div>

                    {aboutForm.content && (
                      <div className="mt-4 border rounded-xl overflow-hidden max-w-md bg-muted/20 animate-fade-in shadow-soft">
                        <img src={aboutForm.content} alt="Resort image preview" className="w-full h-44 object-cover" />
                      </div>
                    )}
                  </form>
                </Panel>
              )}

              {/* SECTION 4: Features Page */}
              {activeTab === "features" && (
                <Panel 
                  title="Dynamic Features Directory" 
                  description="Exhaustive feature modules directory rendered dynamically on the public features list catalog."
                  actions={
                    <div className="flex gap-2">
                      <Button onClick={() => handlePreviewPage("/features")} variant="outline" size="sm" className="rounded-full text-xs font-semibold gap-1.5 hover:bg-muted text-navy border-muted">
                        <Eye className="size-4" /> Live Page Preview
                      </Button>
                      <Button
                        onClick={() => {
                          setFeatureForm({ title: "", excerpt: "", icon: "Building2", tag: "", status: "Active" });
                          setModalType("add_feature");
                          setModalOpen(true);
                        }}
                        className="bg-navy hover:bg-navy/90 text-cream rounded-full text-xs font-semibold"
                      >
                        <Plus className="size-4 mr-1.5" /> Add Custom Module
                      </Button>
                    </div>
                  }
                >
                  {loading ? (
                    <LoadingRows rows={3} />
                  ) : features.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground font-ui">No features cataloged in dynamic database.</div>
                  ) : (
                    <div className="divide-y px-4">
                      {features.map((f, idx) => {
                        const isInactive = f.status === "Inactive";
                        return (
                          <div key={f.id || f._id} className="py-4 first:pt-2 last:pb-2 flex items-start justify-between gap-4 font-ui">
                            <div className="space-y-1.5 text-left flex-1 min-w-0">
                              <div className="flex gap-2 items-center">
                                <span className="font-mono text-muted-foreground text-xs">{String(idx + 1).padStart(2, "0")}.</span>
                                <h4 className="font-semibold text-navy text-sm truncate">{f.title}</h4>
                                <Tag tone={isInactive ? "neutral" : "brand"}>{f.status || "Active"}</Tag>
                              </div>
                              <p className="text-muted-foreground text-xs leading-relaxed max-w-2xl">{f.excerpt}</p>
                              {f.tag && (
                                <div className="flex flex-wrap gap-1 pt-1.5">
                                  {f.tag.split(", ").map((pt, pIdx) => (
                                    <span key={pIdx} className="text-[9px] font-bold bg-purple/10 text-purple px-2 py-0.5 rounded-full">{pt}</span>
                                  ))}
                                </div>
                              )}
                            </div>
                            
                            <div className="flex gap-2 shrink-0">
                              <button
                                onClick={() => {
                                  setSelectedItem(f);
                                  setFeatureForm({
                                    title: f.title || "",
                                    excerpt: f.excerpt || "",
                                    icon: f.icon || "Building2",
                                    tag: f.tag || "",
                                    status: f.status || "Active"
                                  });
                                  setModalType("edit_feature");
                                  setModalOpen(true);
                                }}
                                className="p-2 rounded-full hover:bg-muted text-navy-deep cursor-pointer transition-colors"
                              >
                                <Edit2 className="size-4" />
                              </button>
                              <button
                                onClick={() => openDeleteModal(f, "feature")}
                                className="p-2 rounded-full hover:bg-error/10 text-error cursor-pointer transition-colors"
                              >
                                <Trash2 className="size-4" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </Panel>
              )}

              {/* SECTION 5: Blog Articles */}
              {activeTab === "blogs" && (
                <Panel 
                  title="Marketing Blog Index Manager" 
                  description="Configure dynamic blog journals roll pages draft/published narratives."
                  actions={
                    <div className="flex gap-2">
                      <Button onClick={() => handlePreviewPage("/blog")} variant="outline" size="sm" className="rounded-full text-xs font-semibold gap-1.5 hover:bg-muted text-navy border-muted">
                        <Eye className="size-4" /> Live Blog Preview
                      </Button>
                      <Button
                        onClick={() => {
                          setBlogForm({
                            title: "",
                            slug: "",
                            excerpt: "",
                            author: "Super Admin",
                            role: "Hour Stay Group",
                            tag: "Hotel Management",
                            readTime: "5 min read",
                            content: "",
                            status: "Published",
                            description: "",
                            imageUrl: "",
                            imagePublicId: ""
                          });
                          setModalType("add_blog");
                          setModalOpen(true);
                        }}
                        className="bg-navy hover:bg-navy/90 text-cream rounded-full text-xs font-semibold"
                      >
                        <Plus className="size-4 mr-1.5" /> Write Dynamic Article
                      </Button>
                    </div>
                  }
                >
                  {loading ? (
                    <LoadingRows rows={3} />
                  ) : blogs.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground font-ui">No blog articles published.</div>
                  ) : (
                    <div className="divide-y px-4">
                      {blogs.map((b) => {
                        const isDraft = b.status === "Draft";
                        const displayImg = b.imageUrl || b.description;
                        return (
                          <div key={b.id || b._id} className="py-4 first:pt-2 last:pb-2 flex items-start gap-4 font-ui">
                            {/* Blog Cover Image / Placeholder Thumbnail */}
                            <div className="size-16 rounded overflow-hidden border border-muted bg-white shrink-0 flex items-center justify-center">
                              {displayImg ? (
                                <img src={displayImg} className="w-full h-full object-cover" alt="Thumbnail" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center bg-muted text-[9px] text-muted-foreground font-semibold text-center leading-tight p-1">
                                  No image
                                </div>
                              )}
                            </div>

                            <div className="space-y-1.5 text-left flex-1 min-w-0">
                              <div className="flex gap-2 items-center">
                                <Tag tone={isDraft ? "neutral" : "brand"}>{b.status || "Published"}</Tag>
                                <span className="text-[10px] text-muted-foreground">{b.readTime} · {b.date || "Just now"}</span>
                              </div>
                              <h4 className="font-semibold text-navy text-sm truncate">{b.title}</h4>
                              <p className="text-muted-foreground text-xs leading-relaxed max-w-2xl">{b.excerpt}</p>
                              <p className="text-[10px] text-muted-foreground">Author: <strong>{b.author}</strong> ({b.role}) · Route: <span className="font-mono text-purple">{`/blog/${b.slug}`}</span></p>
                            </div>
                            
                            <div className="flex gap-2 shrink-0">
                              <button
                                onClick={() => {
                                  setSelectedItem(b);
                                  setBlogForm({
                                    title: b.title || "",
                                    slug: b.slug || "",
                                    excerpt: b.excerpt || "",
                                    author: b.author || "",
                                    role: b.role || "",
                                    tag: b.tag || "Hotel Management",
                                    readTime: b.readTime || "5 min read",
                                    content: b.content || "",
                                    status: b.status || "Published",
                                    description: b.description || "",
                                    imageUrl: b.imageUrl || "",
                                    imagePublicId: b.imagePublicId || ""
                                  });
                                  setModalType("edit_blog");
                                  setModalOpen(true);
                                }}
                                className="p-2 rounded-full hover:bg-muted text-navy-deep cursor-pointer transition-colors"
                              >
                                <Edit2 className="size-4" />
                              </button>
                              <button
                                onClick={() => openDeleteModal(b, "blog")}
                                className="p-2 rounded-full hover:bg-error/10 text-error cursor-pointer transition-colors"
                              >
                                <Trash2 className="size-4" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </Panel>
              )}

              {/* SECTION 6: Contact details */}
              {activeTab === "contact" && (
                <Panel 
                  title="Contact Information settings" 
                  description="Manage official phone lines, coordinates locations, physical address and social handles."
                  actions={
                    <Button onClick={() => handlePreviewPage("/contact")} variant="outline" size="sm" className="rounded-full text-xs font-semibold gap-1.5 hover:bg-muted text-navy border-muted">
                      <Eye className="size-4" /> Live Page Preview
                    </Button>
                  }
                >
                  <form onSubmit={handleUpdateSection} className="p-5 space-y-4 text-left">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <Label htmlFor="cont-name" className="text-xs text-navy font-semibold">Office Label Header</Label>
                        <Input
                          id="cont-name"
                          value={contactForm.name}
                          onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                          className="h-10 text-xs bg-white"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="cont-email" className="text-xs text-navy font-semibold">Official Helpline Email</Label>
                        <Input
                          id="cont-email"
                          value={contactForm.email}
                          onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                          className="h-10 text-xs bg-white"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <Label htmlFor="cont-phone" className="text-xs text-navy font-semibold">Helpline Telephone</Label>
                        <Input
                          id="cont-phone"
                          value={contactForm.phone}
                          onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })}
                          className="h-10 text-xs bg-white"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="cont-hours" className="text-xs text-navy font-semibold">Working Operations Hours</Label>
                        <Input
                          id="cont-hours"
                          value={contactForm.hours}
                          onChange={(e) => setContactForm({ ...contactForm, hours: e.target.value })}
                          className="h-10 text-xs bg-white"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="cont-address" className="text-xs text-navy font-semibold">Physical Head Office Address</Label>
                      <Input
                        id="cont-address"
                        value={contactForm.address}
                        onChange={(e) => setContactForm({ ...contactForm, address: e.target.value })}
                        className="h-10 text-xs bg-white"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="cont-desc" className="text-xs text-navy font-semibold">Helpline Service Description</Label>
                      <Textarea
                        id="cont-desc"
                        value={contactForm.description}
                        onChange={(e) => setContactForm({ ...contactForm, description: e.target.value })}
                        className="min-h-[80px] text-xs resize-none bg-white"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <Label htmlFor="cont-map" className="text-xs text-navy font-semibold">Map Location Label</Label>
                        <Input
                          id="cont-map"
                          value={contactForm.subject}
                          onChange={(e) => setContactForm({ ...contactForm, subject: e.target.value })}
                          className="h-10 text-xs bg-white"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="cont-social" className="text-xs text-navy font-semibold">Social Media Handles (CSV Links)</Label>
                        <Input
                          id="cont-social"
                          value={contactForm.message}
                          onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                          className="h-10 text-xs bg-white"
                        />
                      </div>
                    </div>
                  </form>
                </Panel>
              )}

            </div>
          )}

        </div>

      </div>

      {/* Confirmation Overlays */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-deep/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-[0_20px_50px_rgba(13,27,42,0.35)] relative border border-navy/5">
            <div className="flex items-center justify-between pb-4 border-b border-muted">
              <h3 className="font-display font-bold text-lg text-navy">
                {modalType === "add_feature" && "Onboard Custom Feature"}
                {modalType === "edit_feature" && "Modify Feature Settings"}
                {modalType === "add_blog" && "Write New Journal Article"}
                {modalType === "edit_blog" && "Modify Article Details"}
                {modalType.startsWith("delete") && "Confirm Permanent Deletion"}
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="text-muted-foreground hover:text-navy cursor-pointer size-8 rounded-full hover:bg-muted flex items-center justify-center transition-colors"
              >
                <X className="size-4" />
              </button>
            </div>

            {modalType.startsWith("delete") ? (
              <div className="py-6 space-y-4 text-center">
                <AlertTriangle className="size-12 text-error mx-auto animate-bounce" />
                <h4 className="font-semibold text-navy text-base font-ui">Remove Item Permanently?</h4>
                <p className="text-muted-foreground text-xs max-w-xs mx-auto font-ui font-medium">
                  Are you sure you want to delete this CMS document? It will be removed from all guest and public portal directory views instantly.
                </p>
                
                <div className="flex gap-3 justify-center pt-4 border-t mt-5">
                  <Button variant="ghost" onClick={() => setModalOpen(false)} className="rounded-full text-xs font-semibold">
                    Cancel
                  </Button>
                  <Button onClick={confirmDelete} className="bg-error hover:bg-error/90 text-white rounded-full px-5 text-xs font-semibold">
                    Delete Document
                  </Button>
                </div>
              </div>
            ) : modalType.includes("feature") ? (
              <form onSubmit={handleFeatureSubmit} className="py-4 space-y-4 text-left font-ui">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="feat-title" className="text-xs text-navy font-semibold">Module Title</Label>
                    <Input
                      id="feat-title"
                      required
                      value={featureForm.title}
                      onChange={(e) => setFeatureForm({ ...featureForm, title: e.target.value })}
                      placeholder="e.g. UPI Reconciliation"
                      className="mt-1 h-10 text-xs bg-white font-sans"
                    />
                  </div>
                  <div>
                    <Label htmlFor="feat-status" className="text-xs text-navy font-semibold">Display State</Label>
                    <select
                      id="feat-status"
                      value={featureForm.status}
                      onChange={(e) => setFeatureForm({ ...featureForm, status: e.target.value })}
                      className="w-full bg-white border border-muted px-3 h-10 rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-purple mt-1"
                    >
                      <option value="Active">Active (Visible in Directory)</option>
                      <option value="Inactive">Inactive (Hidden)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="feat-desc" className="text-xs text-navy font-semibold">Description Summary</Label>
                  <Textarea
                    id="feat-desc"
                    required
                    value={featureForm.excerpt}
                    onChange={(e) => setFeatureForm({ ...featureForm, excerpt: e.target.value })}
                    placeholder="Provide overview of details..."
                    className="mt-1 min-h-[90px] text-xs resize-none bg-white font-sans"
                  />
                </div>

                <div>
                  <Label htmlFor="feat-tag" className="text-xs text-navy font-semibold">Key Bullet Points (Comma separated list)</Label>
                  <Input
                    id="feat-tag"
                    value={featureForm.tag}
                    onChange={(e) => setFeatureForm({ ...featureForm, tag: e.target.value })}
                    placeholder="e.g. Bullet 1, Bullet 2, Bullet 3"
                    className="mt-1 h-10 text-xs bg-white font-sans"
                  />
                </div>

                <div>
                  <Label htmlFor="feat-icon" className="text-xs text-navy font-semibold">Lucide Icon Class</Label>
                  <Input
                    id="feat-icon"
                    required
                    value={featureForm.icon}
                    onChange={(e) => setFeatureForm({ ...featureForm, icon: e.target.value })}
                    placeholder="e.g. Building2, CalendarDays, Key"
                    className="mt-1 h-10 text-xs bg-white font-mono"
                  />
                </div>

                <div className="flex gap-3 justify-end pt-4 border-t border-muted mt-5">
                  <Button variant="ghost" type="button" onClick={() => setModalOpen(false)} className="rounded-full text-xs font-semibold">
                    Cancel
                  </Button>
                  <Button type="submit" className="bg-navy hover:bg-navy/90 text-white rounded-full px-5 text-xs font-semibold">
                    Save Feature
                  </Button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleBlogSubmit} className="py-4 space-y-4 text-left font-ui">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="blog-title" className="text-xs text-navy font-semibold">Article Title</Label>
                    <Input
                      id="blog-title"
                      required
                      value={blogForm.title}
                      onChange={(e) => setBlogForm({ ...blogForm, title: e.target.value })}
                      placeholder="Title of post..."
                      className="mt-1 h-10 text-xs bg-white"
                    />
                  </div>
                  <div>
                    <Label htmlFor="blog-slug" className="text-xs text-navy font-semibold">Article Slug URL</Label>
                    <Input
                      id="blog-slug"
                      required
                      value={blogForm.slug}
                      onChange={(e) => setBlogForm({ ...blogForm, slug: e.target.value })}
                      placeholder="e.g. direct-bookings-growth"
                      className="mt-1 h-10 text-xs bg-white font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="blog-tag" className="text-xs text-navy font-semibold">Category Tag</Label>
                    <Input
                      id="blog-tag"
                      required
                      value={blogForm.tag}
                      onChange={(e) => setBlogForm({ ...blogForm, tag: e.target.value })}
                      placeholder="e.g. Hotel Management"
                      className="mt-1 h-10 text-xs bg-white"
                    />
                  </div>
                  <div>
                    <Label htmlFor="blog-status" className="text-xs text-navy font-semibold">Publication State</Label>
                    <select
                      id="blog-status"
                      value={blogForm.status}
                      onChange={(e) => setBlogForm({ ...blogForm, status: e.target.value })}
                      className="w-full bg-white border border-muted px-3 h-10 rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-purple mt-1"
                    >
                      <option value="Published">Published (Live on Roll)</option>
                      <option value="Draft">Draft (Awaiting approval)</option>
                    </select>
                  </div>
                </div>

                {uploading ? (
                  <div className="space-y-1 text-left">
                    <Label className="text-xs text-navy font-semibold">Featured Article Cover Image</Label>
                    <div className="border border-dashed border-navy/15 rounded-lg p-5 bg-cream/10 flex flex-col items-center justify-center gap-2.5 min-h-[90px]">
                      <RefreshCw className="size-5 text-navy animate-spin" />
                      <p className="text-[10px] text-navy font-semibold uppercase tracking-wider">Uploading featured image...</p>
                    </div>
                  </div>
                ) : (blogForm.imageUrl || blogForm.description) ? (
                  <div className="space-y-1.5 text-left">
                    <Label className="text-xs text-navy font-semibold">Featured Article Cover Image</Label>
                    <div className="flex items-center gap-4 border border-muted p-3 rounded-lg bg-cream/20">
                      <img 
                        src={blogForm.imageUrl || blogForm.description} 
                        className="h-16 w-24 object-cover rounded-md border border-navy/10 bg-white" 
                        alt="Preview" 
                        onError={(e) => {
                          e.target.src = "https://images.unsplash.com/photo-1546410531-bb4caa6b424d?q=80&w=400&auto=format&fit=crop";
                        }}
                      />
                      <div className="flex-1 text-left min-w-0">
                        <p className="text-[10px] text-muted-foreground truncate">{blogForm.imageUrl || blogForm.description}</p>
                        <div className="flex gap-2 mt-2">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => triggerImageUpload(setBlogForm, blogForm, "blog", "blog cover image")}
                            className="text-[10px] font-semibold border-navy/20 text-navy h-7 px-2.5 rounded hover:bg-navy/5"
                          >
                            Replace Image
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                              if (window.confirm("Are you sure you want to remove this featured image?")) {
                                setBlogForm({ ...blogForm, imageUrl: "", imagePublicId: "", description: "" });
                              }
                            }}
                            className="text-[10px] font-semibold border-error/20 text-error hover:text-error hover:bg-error/5 h-7 px-2.5 rounded"
                          >
                            Remove
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1 text-left">
                    <Label className="text-xs text-navy font-semibold">Featured Article Cover Image</Label>
                    <div className="border border-dashed border-navy/15 rounded-lg p-5 text-center bg-cream/10 flex flex-col items-center justify-center min-h-[90px]">
                      <Button
                        type="button"
                        onClick={() => triggerImageUpload(setBlogForm, blogForm, "blog", "blog cover image")}
                        className="bg-navy hover:bg-navy/90 text-white rounded-full text-xs font-semibold"
                      >
                        <UploadCloud className="size-4 mr-1.5" /> Upload Featured Image
                      </Button>
                      <p className="text-[10px] text-muted-foreground mt-2 font-sans">Supported formats: JPG, JPEG, PNG, WEBP. Max 5MB.</p>
                    </div>
                  </div>
                )}

                <div>
                  <Label htmlFor="blog-excerpt" className="text-xs text-navy font-semibold">Short Excerpt Summary</Label>
                  <Textarea
                    id="blog-excerpt"
                    required
                    value={blogForm.excerpt}
                    onChange={(e) => setBlogForm({ ...blogForm, excerpt: e.target.value })}
                    placeholder="Short description snippet..."
                    className="mt-1 min-h-[60px] text-xs resize-none bg-white"
                  />
                </div>

                <div>
                  <Label htmlFor="blog-content" className="text-xs text-navy font-semibold">Full Markdown Narrative Content</Label>
                  <Textarea
                    id="blog-content"
                    required
                    value={blogForm.content}
                    onChange={(e) => setBlogForm({ ...blogForm, content: e.target.value })}
                    placeholder="Write details of article post..."
                    className="mt-1 min-h-[140px] text-xs bg-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="blog-auth" className="text-xs text-navy font-semibold">Author Name</Label>
                    <Input
                      id="blog-auth"
                      required
                      value={blogForm.author}
                      onChange={(e) => setBlogForm({ ...blogForm, author: e.target.value })}
                      className="mt-1 h-10 text-xs bg-white"
                    />
                  </div>
                  <div>
                    <Label htmlFor="blog-role" className="text-xs text-navy font-semibold">Author Role Caption</Label>
                    <Input
                      id="blog-role"
                      required
                      value={blogForm.role}
                      onChange={(e) => setBlogForm({ ...blogForm, role: e.target.value })}
                      className="mt-1 h-10 text-xs bg-white"
                    />
                  </div>
                </div>

                <div className="flex gap-3 justify-end pt-4 border-t border-muted mt-5 font-sans">
                  <Button variant="ghost" type="button" onClick={() => setModalOpen(false)} className="rounded-full text-xs font-semibold">
                    Cancel
                  </Button>
                  <Button type="submit" className="bg-navy hover:bg-navy/90 text-white rounded-full px-5 text-xs font-semibold">
                    Save Article
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export const Route = createFileRoute("/super-admin/branding")({
  head: () => ({
    meta: [
      { title: "Loyalty & Branding — Hour Stay" },
      { name: "description", content: "Manage dynamic landing page sections and FAQ contents." },
      { property: "og:title", content: "Loyalty & Branding — Hour Stay" },
      { property: "og:description", content: "Manage dynamic landing page sections and FAQ contents." }
    ]
  }),
  component: SuperAdminBranding
});
