import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageHeader, Panel, Tag, statusTone, Notice, LoadingRows, HorizontalRouteTabs } from "@/components/hs/kit";
import { superAdminService } from "@/services/superAdmin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, X, Trash2, Edit2, FileText, HelpCircle, MessageSquare, Globe, Heart, Bell, ScrollText, Sparkles } from "lucide-react";

const systemTabs = [
  { label: "Alerts & Notifications", to: "/super-admin/notifications", icon: Bell },
  { label: "Audit Trails", to: "/super-admin/audit-logs", icon: ScrollText },
  { label: "CMS & Landing Branding", to: "/super-admin/branding", icon: Sparkles }
];

function SuperAdminBranding() {
  const [activeTab, setActiveTab] = useState("blogs"); // 'blogs' | 'faqs' | 'contacts'
  const [cmsItems, setCmsItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modal States
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState("add_blog"); // 'add_blog' | 'edit_blog' | 'add_faq' | 'edit_faq' | 'delete'
  const [selectedItem, setSelectedItem] = useState(null);

  // Form Fields
  const [blogForm, setBlogForm] = useState({
    title: "",
    slug: "",
    excerpt: "",
    author: "",
    role: "",
    tag: "",
    readTime: "5 min read"
  });

  const [faqForm, setFaqForm] = useState({
    question: "",
    answer: ""
  });

  const loadCms = async () => {
    setLoading(true);
    try {
      const res = await superAdminService.getCmsItems();
      if (res.success) {
        setCmsItems(res.data);
      }
    } catch (err) {
      setError(err.message || "Failed to load CMS content");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCms();
  }, []);

  const openAddBlogModal = () => {
    setBlogForm({
      title: "",
      slug: "",
      excerpt: "",
      author: "Super Admin",
      role: "Hour Stay Group",
      tag: "Hotel Management",
      readTime: "5 min read"
    });
    setModalType("add_blog");
    setModalOpen(true);
  };

  const openEditBlogModal = (item) => {
    setSelectedItem(item);
    setBlogForm({
      title: item.title || "",
      slug: item.slug || "",
      excerpt: item.excerpt || "",
      author: item.author || "",
      role: item.role || "",
      tag: item.tag || "",
      readTime: item.readTime || "5 min read"
    });
    setModalType("edit_blog");
    setModalOpen(true);
  };

  const openAddFaqModal = () => {
    setFaqForm({ question: "", answer: "" });
    setModalType("add_faq");
    setModalOpen(true);
  };

  const openEditFaqModal = (item) => {
    setSelectedItem(item);
    setFaqForm({
      question: item.question || "",
      answer: item.answer || ""
    });
    setModalType("edit_faq");
    setModalOpen(true);
  };

  const openDeleteModal = (item) => {
    setSelectedItem(item);
    setModalType("delete");
    setModalOpen(true);
  };

  const handleBlogSubmit = async (e) => {
    e.preventDefault();
    try {
      if (modalType === "add_blog") {
        const res = await superAdminService.createCmsItem({
          type: "blog",
          ...blogForm
        });
        if (res.success) {
          setModalOpen(false);
          loadCms();
        }
      } else if (modalType === "edit_blog") {
        const res = await superAdminService.updateCmsItem(selectedItem.id || selectedItem._id, {
          type: "blog",
          ...blogForm
        });
        if (res.success) {
          setModalOpen(false);
          loadCms();
        }
      }
    } catch (err) {
      setError(err.message || "Failed to save blog post");
    }
  };

  const handleFaqSubmit = async (e) => {
    e.preventDefault();
    try {
      if (modalType === "add_faq") {
        const res = await superAdminService.createCmsItem({
          type: "faq",
          ...faqForm
        });
        if (res.success) {
          setModalOpen(false);
          loadCms();
        }
      } else if (modalType === "edit_faq") {
        const res = await superAdminService.updateCmsItem(selectedItem.id || selectedItem._id, {
          type: "faq",
          ...faqForm
        });
        if (res.success) {
          setModalOpen(false);
          loadCms();
        }
      }
    } catch (err) {
      setError(err.message || "Failed to save FAQ item");
    }
  };

  const handleDeleteSubmit = async () => {
    try {
      const res = await superAdminService.deleteCmsItem(selectedItem.id || selectedItem._id);
      if (res.success) {
        setModalOpen(false);
        loadCms();
      }
    } catch (err) {
      setError(err.message || "Failed to delete item");
    }
  };

  const blogs = cmsItems.filter(item => item.type === "blog");
  const faqs = cmsItems.filter(item => item.type === "faq");
  const contacts = cmsItems.filter(item => item.type === "contact");

  return (
    <div className="space-y-6">
      <PageHeader
        title="CMS & Branding Console"
        subtitle="Manage landing page content, publish marketing blogs, update FAQs, and view guest contact submissions."
      />

      <HorizontalRouteTabs tabs={systemTabs} />

      {error && <Notice tone="error" title="CMS Operation Error" className="text-left">{error}</Notice>}

      {/* Tabs */}
      <div className="flex gap-2 border-b pb-1">
        <button
          onClick={() => setActiveTab("blogs")}
          className={`pb-3 px-4 font-semibold text-xs transition-all relative ${
            activeTab === "blogs"
              ? "text-purple border-b-2 border-purple"
              : "text-muted-foreground hover:text-navy-deep"
          }`}
        >
          <div className="flex items-center gap-1.5">
            <FileText className="size-4" /> Marketing Blog Index
          </div>
        </button>
        <button
          onClick={() => setActiveTab("faqs")}
          className={`pb-3 px-4 font-semibold text-xs transition-all relative ${
            activeTab === "faqs"
              ? "text-purple border-b-2 border-purple"
              : "text-muted-foreground hover:text-navy-deep"
          }`}
        >
          <div className="flex items-center gap-1.5">
            <HelpCircle className="size-4" /> Help FAQ Ledger
          </div>
        </button>
        <button
          onClick={() => setActiveTab("contacts")}
          className={`pb-3 px-4 font-semibold text-xs transition-all relative ${
            activeTab === "contacts"
              ? "text-purple border-b-2 border-purple"
              : "text-muted-foreground hover:text-navy-deep"
          }`}
        >
          <div className="flex items-center gap-1.5">
            <MessageSquare className="size-4" /> Contact Submissions
          </div>
        </button>
      </div>

      {activeTab === "blogs" && (
        <Panel
          title="CMS Blog Articles"
          description="Promotional material displayed on the public landing page."
          actions={
            <Button onClick={openAddBlogBlogModal => openAddBlogModal()} className="bg-navy hover:bg-navy/90 text-white rounded-full text-xs">
              <Plus className="size-4 mr-2" /> Write Article
            </Button>
          }
        >
          {loading ? (
            <LoadingRows rows={3} />
          ) : blogs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">No blog posts registered in database.</div>
          ) : (
            <div className="divide-y p-4">
              {blogs.map((b) => (
                <div key={b.id || b._id} className="py-4 first:pt-0 last:pb-0 flex items-start justify-between gap-4">
                  <div className="space-y-1.5">
                    <div className="flex gap-2 items-center">
                      <Tag tone="brand">{b.tag}</Tag>
                      <span className="text-[10px] text-muted-foreground">{b.readTime} · {b.date || "Just now"}</span>
                    </div>
                    <h4 className="font-semibold text-navy text-sm">{b.title}</h4>
                    <p className="text-muted-foreground text-xs leading-relaxed max-w-2xl">{b.excerpt}</p>
                    <p className="text-[10px] text-muted-foreground">By <strong>{b.author}</strong> ({b.role})</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => openEditBlogModal(b)} className="p-1.5 rounded-full hover:bg-muted text-navy-deep">
                      <Edit2 className="size-3.5" />
                    </button>
                    <button onClick={() => openDeleteModal(b)} className="p-1.5 rounded-full hover:bg-error/10 text-error">
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>
      )}

      {activeTab === "faqs" && (
        <Panel
          title="Frequently Asked Questions"
          description="FAQ lists shown on guest portal and help centers."
          actions={
            <Button onClick={openAddFaqModal} className="bg-navy hover:bg-navy/90 text-white rounded-full text-xs">
              <Plus className="size-4 mr-2" /> Create FAQ
            </Button>
          }
        >
          {loading ? (
            <LoadingRows rows={3} />
          ) : faqs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">No FAQ items registered.</div>
          ) : (
            <div className="divide-y p-4">
              {faqs.map((f) => (
                <div key={f.id || f._id} className="py-3 first:pt-0 last:pb-0 flex items-start justify-between gap-4">
                  <div className="space-y-1 max-w-3xl">
                    <h5 className="font-semibold text-navy text-xs flex gap-1.5 items-center">
                      <HelpCircle className="size-4 text-purple" /> {f.question}
                    </h5>
                    <p className="text-muted-foreground text-xs leading-relaxed pl-5">{f.answer}</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => openEditFaqModal(f)} className="p-1.5 rounded-full hover:bg-muted text-navy-deep">
                      <Edit2 className="size-3.5" />
                    </button>
                    <button onClick={() => openDeleteModal(f)} className="p-1.5 rounded-full hover:bg-error/10 text-error">
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>
      )}

      {activeTab === "contacts" && (
        <Panel title="Guest Contact Messages" description="Queries sent from the public website contact forms.">
          {loading ? (
            <LoadingRows rows={3} />
          ) : contacts.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">No guest inquiries recorded.</div>
          ) : (
            <div className="divide-y p-4">
              {contacts.map((c) => (
                <div key={c.id || c._id} className="py-4 first:pt-0 last:pb-0 space-y-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <strong className="text-navy text-sm font-semibold">{c.name}</strong>
                      <p className="text-muted-foreground text-xs">{c.email} · Subject: <strong>{c.subject}</strong></p>
                    </div>
                    <span className="text-[10px] text-muted-foreground font-mono">{new Date(c.createdAt).toLocaleDateString("en-IN")}</span>
                  </div>
                  <p className="bg-muted/30 border border-muted p-3 rounded-lg text-xs leading-relaxed text-navy max-w-4xl">{c.message}</p>
                </div>
              ))}
            </div>
          )}
        </Panel>
      )}

      {/* Modals */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-deep/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-[0_20px_50px_rgba(13,27,42,0.35)] relative border border-navy/5">
            <div className="flex items-center justify-between pb-4 border-b border-muted">
              <h3 className="font-display font-bold text-lg text-navy">
                {modalType === "add_blog" && "Draft Blog Post"}
                {modalType === "edit_blog" && "Edit Blog Post"}
                {modalType === "add_faq" && "Add Help FAQ"}
                {modalType === "edit_faq" && "Edit Help FAQ"}
                {modalType === "delete" && "Remove Item Confirmation"}
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="text-muted-foreground hover:text-navy cursor-pointer size-8 rounded-full hover:bg-muted flex items-center justify-center transition-colors"
              >
                <X className="size-4" />
              </button>
            </div>

            {modalType === "delete" ? (
              <div className="py-6 space-y-4 text-center">
                <Globe className="size-12 text-error mx-auto animate-bounce" />
                <h4 className="font-semibold text-navy text-base">Delete CMS Element</h4>
                <p className="text-muted-foreground text-xs max-w-xs mx-auto">
                  Are you sure you want to permanently delete this content from the landing page repository?
                </p>
                <div className="flex gap-3 justify-center pt-4">
                  <Button variant="ghost" onClick={() => setModalOpen(false)} className="rounded-full">
                    Cancel
                  </Button>
                  <Button onClick={handleDeleteSubmit} className="bg-error hover:bg-error/90 text-white rounded-full px-5">
                    Confirm Delete
                  </Button>
                </div>
              </div>
            ) : modalType.includes("faq") ? (
              <form onSubmit={handleFaqSubmit} className="py-4 space-y-4 text-left">
                <div>
                  <Label htmlFor="faq-q" className="text-xs text-navy font-semibold">Question</Label>
                  <Input
                    id="faq-q"
                    required
                    value={faqForm.question}
                    onChange={(e) => setFaqForm({ ...faqForm, question: e.target.value })}
                    placeholder="e.g. Does Hour Stay support split booking tariffs?"
                    className="mt-1 h-10 text-xs"
                  />
                </div>
                <div>
                  <Label htmlFor="faq-a" className="text-xs text-navy font-semibold">Answer Explanation</Label>
                  <Textarea
                    id="faq-a"
                    required
                    value={faqForm.answer}
                    onChange={(e) => setFaqForm({ ...faqForm, answer: e.target.value })}
                    placeholder="Provide details for help center..."
                    className="mt-1 min-h-[120px] text-xs resize-none"
                  />
                </div>
                <div className="flex gap-3 justify-end pt-4 border-t border-muted mt-5">
                  <Button variant="ghost" type="button" onClick={() => setModalOpen(false)} className="rounded-full">
                    Cancel
                  </Button>
                  <Button type="submit" className="bg-navy hover:bg-navy/90 text-white rounded-full px-5">
                    Save FAQ
                  </Button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleBlogSubmit} className="py-4 space-y-4 text-left">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="blog-title" className="text-xs text-navy font-semibold">Article Title</Label>
                    <Input
                      id="blog-title"
                      required
                      value={blogForm.title}
                      onChange={(e) => setBlogForm({ ...blogForm, title: e.target.value })}
                      placeholder="e.g. Simplifying PMS"
                      className="mt-1 h-10 text-xs"
                    />
                  </div>
                  <div>
                    <Label htmlFor="blog-slug" className="text-xs text-navy font-semibold">Slug URL</Label>
                    <Input
                      id="blog-slug"
                      required
                      value={blogForm.slug}
                      onChange={(e) => setBlogForm({ ...blogForm, slug: e.target.value })}
                      placeholder="e.g. simplifying-pms"
                      className="mt-1 h-10 text-xs"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="blog-excerpt" className="text-xs text-navy font-semibold">Excerpt Description</Label>
                  <Textarea
                    id="blog-excerpt"
                    required
                    value={blogForm.excerpt}
                    onChange={(e) => setBlogForm({ ...blogForm, excerpt: e.target.value })}
                    placeholder="Brief summary of the blog post to display in preview..."
                    className="mt-1 min-h-[80px] text-xs resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="blog-author" className="text-xs text-navy font-semibold">Author Name</Label>
                    <Input
                      id="blog-author"
                      required
                      value={blogForm.author}
                      onChange={(e) => setBlogForm({ ...blogForm, author: e.target.value })}
                      className="mt-1 h-10 text-xs"
                    />
                  </div>
                  <div>
                    <Label htmlFor="blog-role" className="text-xs text-navy font-semibold">Author Role</Label>
                    <Input
                      id="blog-role"
                      required
                      value={blogForm.role}
                      onChange={(e) => setBlogForm({ ...blogForm, role: e.target.value })}
                      className="mt-1 h-10 text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="blog-tag" className="text-xs text-navy font-semibold">Article Tag Category</Label>
                    <Input
                      id="blog-tag"
                      required
                      value={blogForm.tag}
                      onChange={(e) => setBlogForm({ ...blogForm, tag: e.target.value })}
                      placeholder="e.g. Hospitality"
                      className="mt-1 h-10 text-xs"
                    />
                  </div>
                  <div>
                    <Label htmlFor="blog-read" className="text-xs text-navy font-semibold">Read Time</Label>
                    <Input
                      id="blog-read"
                      required
                      value={blogForm.readTime}
                      onChange={(e) => setBlogForm({ ...blogForm, readTime: e.target.value })}
                      className="mt-1 h-10 text-xs"
                    />
                  </div>
                </div>

                <div className="flex gap-3 justify-end pt-4 border-t border-muted mt-5">
                  <Button variant="ghost" type="button" onClick={() => setModalOpen(false)} className="rounded-full">
                    Cancel
                  </Button>
                  <Button type="submit" className="bg-navy hover:bg-navy/90 text-white rounded-full px-5">
                    Save Post
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
      { name: "description", content: "Manage landing page CMS details and FAQ." },
      { property: "og:title", content: "Loyalty & Branding — Hour Stay" },
      { property: "og:description", content: "Manage landing page CMS details and FAQ." }
    ]
  }),
  component: SuperAdminBranding
});
