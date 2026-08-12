import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { SiteLayout } from "@/layouts/SiteLayout";
import { blogPosts } from "@/data/hs-data";
import { Button } from "@/components/ui/button";

// Import Resort Images
import jaipurImg from "@/assets/resort_jaipur.png";
import goaImg from "@/assets/beach_goa.png";
import palaceImg from "@/assets/palace_udaipur.png";
import keralaImg from "@/assets/retreat_kerala.png";

const getPostImage = (slug) => {
  switch (slug) {
    case "direct-bookings-indian-hotels":
      return jaipurImg;
    case "gst-billing-guide-hotels":
      return palaceImg;
    case "pms-simplifies-operations":
      return keralaImg;
    case "ota-channel-management-overbooking":
      return goaImg;
    case "dynamic-pricing-hotel-revenue":
      return palaceImg;
    case "modern-housekeeping-management":
      return jaipurImg;
    default:
      return jaipurImg;
  }
};

export const Route = createFileRoute("/blog/$slug")({
  loader: ({ params }) => {
    const post = blogPosts.find((p) => p.slug === params.slug);
    if (!post) throw notFound();
    return { post };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return { meta: [{ title: "Article not found — Hour Stay" }, { name: "robots", content: "noindex" }] };
    }
    const { post } = loaderData;
    return {
      meta: [
        { title: `${post.title} — Hour Stay Journal` },
        { name: "description", content: post.excerpt },
        { property: "og:title", content: post.title },
        { property: "og:description", content: post.excerpt },
        { property: "og:type", content: "article" }
      ]
    };
  },
  notFoundComponent: PostNotFound,
  component: BlogPost
});

function PostNotFound() {
  return (
    <SiteLayout>
      <div className="mx-auto max-w-xl px-4 py-28 text-center font-ui">
        <h1 className="font-display text-3xl font-semibold text-navy">We couldn't find that article</h1>
        <p className="mt-3 text-muted-foreground">It may have been moved or renamed.</p>
        <Button asChild variant="hero" size="touch" className="mt-6 cursor-pointer">
          <Link to="/blog">Back to the journal</Link>
        </Button>
      </div>
    </SiteLayout>
  );
}

function BlogPost() {
  const { post } = Route.useLoaderData();
  return (
    <SiteLayout>
      <article className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <Link to="/blog" className="text-xs font-medium uppercase tracking-wider text-purple font-ui">
          ← Journal
        </Link>
        <h1 className="mt-4 font-display text-4xl leading-tight font-bold text-navy">{post.title}</h1>
        <p className="mt-4 text-xs sm:text-sm text-muted-foreground font-ui">
          {post.author} · {post.role} · {post.date} · {post.readTime}
        </p>
        
        {/* Dynamic Cover Image instead of gradient box */}
        <div className="mt-8 h-64 sm:h-80 rounded-2xl overflow-hidden shadow-soft relative group">
          <img 
            src={getPostImage(post.slug)} 
            alt={post.title} 
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-101" 
          />
          <div className="absolute inset-0 bg-black/5" />
        </div>

        <div className="mt-10 space-y-5 text-sm sm:text-base leading-relaxed text-foreground/85 text-left font-ui">
          <p className="text-base sm:text-lg text-navy font-bold">{post.excerpt}</p>
          <p>
            On any given Saturday in wedding season, a 120-key property in Jaipur will process
            forty arrivals between 13:00 and 16:00. The difference between a calm lobby and a
            queue at the desk is rarely staffing — it is how many decisions each receptionist has
            to make per guest.
          </p>
          <h2 className="pt-4 font-display text-2xl font-semibold text-navy text-left">Start with the folio</h2>
          <p>
            Every operational habit eventually shows up on the folio. When room moves, late
            check-outs and F&amp;B postings are captured as they happen, the night audit becomes a
            five-minute review rather than a two-hour reconciliation.
          </p>
          <blockquote className="border-l-2 border-gold pl-5 font-display text-xl text-navy italic my-6 text-left">
            “The fastest check-in we ever built was the one where the guest had already told us
            everything, twice.”
          </blockquote>
          <h2 className="pt-4 font-display text-2xl font-semibold text-navy text-left">What to change this week</h2>
          <ul className="list-disc space-y-2 pl-5 text-left">
            <li>Pre-assign rooms for all arrivals with a confirmed ETA before 11:00.</li>
            <li>Move ID capture to pre check-in so the desk only verifies, never types.</li>
            <li>Set rate-parity alerts on your top two OTAs and review them at the morning brief.</li>
          </ul>
        </div>
      </article>
    </SiteLayout>
  );
}