import { HERO_FRAME } from "@/components/studio-hero";

// Static placeholders: the design allows only photo fades to move.
export default function CatalogLoading() {
  return (
    <div role="status">
      <span className="sr-only">Loading the catalog</span>
      <div aria-hidden className={`${HERO_FRAME} bg-line`} />
      <div aria-hidden className="mt-16 h-9 w-56 max-w-full bg-line sm:mt-24" />
    </div>
  );
}
