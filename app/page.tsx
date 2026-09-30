import { Studio } from "@/components/Studio";
import { site } from "@/lib/site";

export default function Home() {
  return (
    <main>
      <h1 className="visually-hidden">
        {site.name}: {site.tagline}
      </h1>
      <Studio site={site} />
      <noscript>
        <p className="noscript">The player needs JavaScript to play music.</p>
      </noscript>
    </main>
  );
}
