import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { SiteLayout } from "@/layouts/SiteLayout";
import { Button } from "@/components/ui/button";
import { blogPosts } from "@/data/hs-data";
import { Sparkles, CalendarDays, ArrowRight } from "lucide-react";

// Import Resort Images for Blog Visuals
import jaipurImg from "@/assets/resort_jaipur.png";
import palaceImg from "@/assets/palace_udaipur.png";
import beachImg from "@/assets/beach_goa.png";
import retreatImg from "@/assets/retreat_kerala.png";

export const Route = createFileRoute("/blog/")({
  head: () => ({
    meta: [
      { title: "Hour Stay Journal — Insights for Smarter Hotel Management" },
      {
        name: "description",
        content: "Revenue tactics, GST guidance, OTA channel management and front-office craft from hoteliers running Hour Stay properties across India."
      },
      { property: "og:title", content: "Hour Stay Journal" },
      { property: "og:description", content: "Revenue, compliance and front-office craft for Indian hotels." }
    ]
  }),
  component: BlogList
});

const getPostImage = (slug) => {
  switch (slug) {
    case "direct-bookings-indian-hotels":
      return jaipurImg;
    case "gst-billing-guide-hotels":
      return palaceImg;
    case "pms-simplifies-operations":
      return retreatImg;
    case "ota-channel-management-overbooking":
      return beachImg;
    case "dynamic-pricing-hotel-revenue":
      return palaceImg;
    case "modern-housekeeping-management":
      return jaipurImg;
    default:
      return jaipurImg;
  }
};

const categories = [
  "All",
  "Hotel Management",
  "Hospitality Trends",
  "Revenue & Pricing",
  "GST & Finance",
  "Guest Experience",
  "Technology"
];

const popularTopics = [
  "OTA management",
  "direct bookings",
  "UPI payments",
  "GST billing",
  "housekeeping",
  "hotel analytics",
  "guest experience"
];

function BlogList() {
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  // Filter blog posts dynamically
  const filteredPosts = selectedCategory === "All" 
    ? blogPosts 
    : blogPosts.filter(p => p.tag === selectedCategory);

  // Identify featured article (first one in full list)
  const featuredArticle = blogPosts[0];

  const handleSubscribe = (e) => {
    e.preventDefault();
    if (email) {
      setSubscribed(true);
      setEmail("");
      setTimeout(() => setSubscribed(false), 5000);
    }
  };

  return (
    <SiteLayout>
      {/* 1. Hero Section */}
      <section className="relative bg-navy py-16 lg:py-20 text-center overflow-hidden border-b border-white/5">
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(91,33,182,0.12),transparent_50%)]" />
        </div>
        <div className="relative z-10 mx-auto max-w-4xl px-4 sm:px-6">
          <span className="inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold/10 px-4 py-1 text-xs font-semibold tracking-wider text-gold uppercase font-ui">
            <Sparkles className="size-3 text-gold" /> Journal & Journal Insights
          </span>
          <h1 className="mt-5 font-display text-4xl leading-[1.1] font-bold text-cream sm:text-5xl lg:text-6xl">
            Insights for <span className="text-[#F5C06A]">smarter hotel</span> management
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-sm sm:text-base leading-relaxed text-cream/70 font-ui">
            Operational advice, regulatory GST updates, and revenue management strategies written by hoteliers, for Indian properties.
          </p>
        </div>
      </section>

      {/* 2. Interactive Category Navigation */}
      <section className="bg-cream py-6 border-b border-navy/5">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="flex flex-wrap justify-center gap-2 overflow-x-auto pb-2 sm:pb-0 scrollbar-none">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold tracking-wide transition-all duration-300 border cursor-pointer ${
                  selectedCategory === cat
                    ? "bg-navy text-cream border-navy shadow-lift"
                    : "bg-white text-navy/70 border-navy/5 hover:border-gold/30 hover:bg-gold/5"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Main Journal Content Layout */}
      <section className="bg-cream/40 py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 space-y-16">
          
          {/* 3. Featured Article (Only show if viewing 'All' and we have articles) */}
          {selectedCategory === "All" && featuredArticle && (
            <div className="space-y-6">
              <span className="text-xs font-bold uppercase tracking-widest text-purple text-left block">Featured Article</span>
              <div className="grid gap-6 lg:grid-cols-12 rounded-2xl border border-navy/5 bg-white overflow-hidden shadow-soft hover:shadow-lift transition-shadow duration-300 lg:h-[350px]">
                <div className="lg:col-span-7 h-56 sm:h-72 lg:h-full relative overflow-hidden group">
                  <img 
                    src={getPostImage(featuredArticle.slug)} 
                    alt={featuredArticle.title} 
                    className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-500" 
                  />
                  <div className="absolute inset-0 bg-black/10" />
                </div>
                <div className="lg:col-span-5 p-6 flex flex-col justify-between text-left h-full">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-purple">{featuredArticle.tag}</span>
                    <h2 className="mt-2 font-display text-xl sm:text-2xl font-bold text-navy hover:text-purple transition-colors leading-snug line-clamp-2">
                      <Link to="/blog/$slug" params={{ slug: featuredArticle.slug }}>
                        {featuredArticle.title}
                      </Link>
                    </h2>
                    <p className="mt-2 text-xs sm:text-sm text-muted-foreground font-ui leading-relaxed line-clamp-3">
                      {featuredArticle.excerpt}
                    </p>
                  </div>
                  <div className="pt-4 border-t border-navy/5 flex items-center justify-between">
                    <div className="text-[11px] font-ui">
                      <p className="font-bold text-navy">{featuredArticle.author}</p>
                      <p className="text-muted-foreground mt-0.5">{featuredArticle.date} · {featuredArticle.readTime}</p>
                    </div>
                    <Button asChild size="sm" variant="ghost" className="text-purple font-semibold hover:bg-purple/5 h-8 px-3 text-xs">
                      <Link to="/blog/$slug" params={{ slug: featuredArticle.slug }}>
                        Read Article <ArrowRight className="size-3 ml-1" />
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Grid Layout: Articles List + Sidebar */}
          <div className="grid gap-10 lg:grid-cols-[1fr_300px] items-start">
            
            {/* 4. Latest Articles Grid */}
            <div className="space-y-8">
              <div className="text-left border-b border-navy/5 pb-4">
                <h3 className="font-display text-xl font-bold text-navy">
                  {selectedCategory === "All" ? "Latest Articles" : `${selectedCategory} Articles`}
                </h3>
              </div>

              {filteredPosts.length > 0 ? (
                <div className="grid gap-6 sm:grid-cols-2">
                  {filteredPosts.map((post) => (
                    <article 
                      key={post.slug}
                      className="group flex flex-col justify-between rounded-xl border border-navy/5 bg-white overflow-hidden shadow-soft hover:-translate-y-1 hover:shadow-lift hover:border-purple/20 transition-all duration-300 h-full"
                    >
                      <div className="text-left flex-grow flex flex-col">
                        <div className="h-44 overflow-hidden relative">
                          <img 
                            src={getPostImage(post.slug)} 
                            alt={post.title} 
                            className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-500" 
                          />
                          <div className="absolute inset-0 bg-black/10" />
                        </div>
                        <div className="p-5 flex-grow flex flex-col">
                          <span className="text-[10px] font-bold uppercase tracking-widest text-purple block mb-1">
                            {post.tag}
                          </span>
                          <h4 className="font-display text-base sm:text-lg font-bold text-navy group-hover:text-purple transition-colors line-clamp-2 leading-snug h-12">
                            <Link to="/blog/$slug" params={{ slug: post.slug }}>
                              {post.title}
                            </Link>
                          </h4>
                          <p className="text-xs text-muted-foreground font-ui leading-relaxed line-clamp-3 mt-3 flex-grow">
                            {post.excerpt}
                          </p>
                        </div>
                      </div>
                      <div className="p-5 pt-0 border-t border-navy/5 mt-4 flex items-center justify-between text-[11px] text-muted-foreground font-ui shrink-0">
                        <span>{post.date} · {post.readTime}</span>
                        <Link to="/blog/$slug" params={{ slug: post.slug }} className="text-purple font-semibold hover:underline flex items-center gap-1">
                          Read More <ArrowRight className="size-3" />
                        </Link>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-navy/15 p-12 text-center">
                  <p className="text-muted-foreground text-sm font-ui">No articles found in this category.</p>
                </div>
              )}
            </div>

            {/* Sidebar Widget Block */}
            <aside className="space-y-8 lg:sticky lg:top-24 text-left">
              
              {/* 5. Popular Topics Tag Cloud */}
              <div className="rounded-xl border border-navy/5 bg-white p-5 shadow-soft">
                <h4 className="font-display text-sm font-bold text-navy uppercase tracking-wider border-b border-navy/5 pb-2 mb-4">
                  Popular Topics
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {popularTopics.map((topic) => (
                    <span 
                      key={topic}
                      className="px-2.5 py-1 rounded bg-cream/60 border border-gold/10 text-[11px] font-semibold text-navy/80 hover:text-purple cursor-pointer transition-colors font-ui capitalize"
                    >
                      {topic}
                    </span>
                  ))}
                </div>
              </div>

              {/* 6. Newsletter Subscription Block */}
              <div className="rounded-xl border border-navy/5 bg-navy p-5 text-cream shadow-soft relative overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,rgba(245,192,106,0.06),transparent_50%)]" />
                <div className="relative z-10 space-y-4">
                  <h4 className="font-display text-base font-bold">Get hospitality insights</h4>
                  <p className="text-xs text-cream/70 font-ui leading-relaxed">
                    Subscribe to receive practical guides on GST slabs, seasonal revenue pricing, and front-desk checklists monthly.
                  </p>
                  
                  {subscribed ? (
                    <div className="p-3 bg-success/20 border border-success/40 text-success rounded text-xs font-semibold font-ui text-center">
                      ✓ Subscribed successfully!
                    </div>
                  ) : (
                    <form onSubmit={handleSubscribe} className="space-y-2 font-ui">
                      <input 
                        type="email" 
                        placeholder="Enter email address" 
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="w-full h-10 px-3 rounded bg-white/10 text-cream border border-white/20 text-xs placeholder:text-cream/40 focus:outline-none focus:border-gold"
                      />
                      <button 
                        type="submit" 
                        className="w-full h-10 rounded bg-gold text-navy hover:bg-gold/90 text-xs font-bold transition-colors cursor-pointer"
                      >
                        Subscribe
                      </button>
                    </form>
                  )}
                </div>
              </div>

            </aside>

          </div>

        </div>
      </section>

      {/* 7. Final CTA Section */}
      <section className="bg-white py-20 text-center border-t border-navy/5 relative overflow-hidden">
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(91,33,182,0.04),transparent_60%)]" />
        </div>
        <div className="relative z-10 mx-auto max-w-3xl px-4 sm:px-6">
          <h2 className="font-display text-3xl font-bold tracking-tight text-navy sm:text-4xl">
            Build a smarter hotel with Hour Stay.
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-sm text-muted-foreground font-ui">
            Explore the calm operating system engineered to save hours and sync reservations.
          </p>
          <div className="mt-8 flex justify-center">
            <Button asChild size="lg" className="rounded-full bg-navy text-cream hover:bg-navy/90 font-semibold px-8 py-6 text-base transition-all duration-300 cursor-pointer shadow-soft">
              <Link to="/features">Explore Features</Link>
            </Button>
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}