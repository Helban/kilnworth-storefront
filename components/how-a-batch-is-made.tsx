import { Photo } from "./photo";

// Each process photo exists at 900x1117 and 450x559 in public/studio/.
const PROCESS_PHOTO = { width: 900, height: 1117 };

const STEPS = [
  {
    name: "Throwing",
    photo: "process-throwing",
    alt: "Two hands shaping a bowl on a spinning wheel",
    text: "Every piece starts on the wheel. A mug takes about ten minutes to throw and two days to dry before it gets a handle.",
  },
  {
    name: "Glazing",
    photo: "process-glazing",
    alt: "A wall of glaze test tiles above buckets of glaze",
    text: "We mix our own glazes and try each one on test tiles before it goes near a pot. The wall of tiles is how we choose.",
  },
  {
    name: "Firing",
    photo: "process-kiln",
    alt: "Mugs and bowls on the shelves of an open kiln",
    text: "The kiln runs for about twelve hours and takes another day to cool. Ash and iron move in the heat, so no two pieces come out the same.",
  },
] as const;

// Throwing gets the large photo on the left; glazing and firing share the right column, each with
// a smaller photo beside its text. On a phone the three stack in order.
export function HowABatchIsMade() {
  const [throwing, ...laterSteps] = STEPS;
  return (
    <section aria-labelledby="batch-heading" className="full-bleed bg-ink text-bg">
      <div className="page-width py-16 sm:py-24">
        <h2 id="batch-heading" className="text-3xl sm:text-4xl">
          How a batch is made
        </h2>
        <ol className="mt-10 grid gap-12 lg:grid-cols-2 lg:grid-rows-[auto_auto] lg:gap-x-16">
          <li className="lg:row-span-2">
            <StepPhoto step={throwing} sizes="(min-width: 75rem) 34rem, (min-width: 64rem) 45vw, 100vw" />
            <h3 className="mt-6 text-2xl">{throwing.name}</h3>
            <p className="mt-2 max-w-[65ch] text-lg leading-relaxed">{throwing.text}</p>
          </li>
          {laterSteps.map((step) => (
            <li key={step.name} className="grid grid-cols-[2fr_3fr] items-start gap-4 sm:gap-8 lg:grid-cols-2">
              <StepPhoto step={step} sizes="(min-width: 75rem) 16rem, (min-width: 64rem) 22vw, 36vw" />
              <div>
                <h3 className="text-2xl">{step.name}</h3>
                <p className="mt-2 leading-relaxed">{step.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function StepPhoto({ step, sizes }: { step: (typeof STEPS)[number]; sizes: string }) {
  const half = PROCESS_PHOTO.width / 2;
  return (
    <Photo
      src={`/studio/${step.photo}-${PROCESS_PHOTO.width}.webp`}
      srcSet={`/studio/${step.photo}-${half}.webp ${half}w, /studio/${step.photo}-${PROCESS_PHOTO.width}.webp ${PROCESS_PHOTO.width}w`}
      sizes={sizes}
      width={PROCESS_PHOTO.width}
      height={PROCESS_PHOTO.height}
      alt={step.alt}
      className="h-auto w-full bg-ink-muted"
    />
  );
}
