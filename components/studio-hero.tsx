import { Photo } from "./photo";

// Shared with app/loading.tsx so the placeholder takes the same space. The negative top margin
// cancels the padding of <main>, so the photo meets the header.
export const HERO_FRAME = "full-bleed relative -mt-8 h-[56vh] min-h-[28rem] sm:-mt-12 lg:h-[72vh]";

export function StudioHero() {
  return (
    <section aria-labelledby="intro-heading" className={HERO_FRAME}>
      <Photo
        src="/studio/studio-wide-2000.webp"
        srcSet="/studio/studio-wide-1000.webp 1000w, /studio/studio-wide-2000.webp 2000w"
        sizes="100vw"
        width={2000}
        height={1116}
        alt="The studio: a worktable by the window, and wooden shelves of mugs, bowls and vases"
        loading="eager"
        className="absolute inset-0 h-full w-full bg-line object-cover"
      />
      {/* The text never sits on the bare photo; see "Second design pass" in NOTES.md. */}
      <div className="hero-scrim absolute inset-x-0 bottom-0 pt-24 pb-10 lg:top-0 lg:flex lg:items-center lg:p-0">
        <div className="page-width text-surface">
          <h1 id="intro-heading" className="text-5xl sm:text-6xl">
            Current batch
          </h1>
          <p className="mt-4 max-w-[30rem] text-lg leading-relaxed">
            Mugs, bowls and vases from our last firing. We make a few of each, and once a piece sells it does not
            come back.
          </p>
          <a href="#pieces" className="button-inverse mt-8">
            See the pieces
          </a>
        </div>
      </div>
    </section>
  );
}
