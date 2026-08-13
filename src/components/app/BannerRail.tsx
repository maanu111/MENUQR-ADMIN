"use client";

import { useEffect, useRef, useState } from "react";

export type BannerSlide = {
  id: string;
  imageUrl: string | null;
  headline: string | null;
  subtext: string | null;
  code: string | null;
};

const HOLD_MS = 4500;

/**
 * The sliding strip at the top of the menu.
 *
 * Built on native scroll-snap rather than a transform carousel, so a thumb
 * swipe is the browser's own smooth scroll and it stays usable if the
 * JavaScript never arrives. The timer only nudges that same scroll along.
 */
export function BannerRail({ banners }: { banners: BannerSlide[] }) {
  const railRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  /* Set once the guest takes over: their swipe outranks our timer. */
  const [held, setHeld] = useState(false);

  const many = banners.length > 1;

  /* Auto-advance, unless there is nothing to advance to, the guest is
     interacting, or they have asked the system for less motion. */
  useEffect(() => {
    if (!many || held) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const timer = window.setInterval(() => {
      const rail = railRef.current;
      if (!rail || document.hidden) return;
      const next = (Math.round(rail.scrollLeft / rail.clientWidth) + 1) % banners.length;
      rail.scrollTo({ left: next * rail.clientWidth, behavior: "smooth" });
    }, HOLD_MS);

    return () => window.clearInterval(timer);
  }, [many, held, banners.length]);

  /* Which dot is lit — read from the scroll position, so it is right whether
     the move came from the timer, a swipe, or a dot. */
  function syncIndex() {
    const rail = railRef.current;
    if (!rail) return;
    setIndex(Math.round(rail.scrollLeft / rail.clientWidth));
  }

  if (banners.length === 0) return null;

  return (
    <section aria-label="Offers and announcements" aria-roledescription="carousel">
      <div
        ref={railRef}
        onScroll={syncIndex}
        onPointerDown={() => setHeld(true)}
        onMouseEnter={() => setHeld(true)}
        onMouseLeave={() => setHeld(false)}
        className="no-bar flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain scroll-smooth rounded-xl"
      >
        {banners.map((banner, i) => (
          <article
            key={banner.id}
            aria-label={`${i + 1} of ${banners.length}`}
            className="relative flex w-full shrink-0 snap-center flex-col justify-end overflow-hidden"
            style={{ aspectRatio: "5 / 2" }}
          >
            {banner.imageUrl ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={banner.imageUrl}
                  alt={banner.headline ?? ""}
                  className="absolute inset-0 size-full object-cover"
                />
                {/* Only darkened where words sit, so the picture stays the picture. */}
                {banner.headline || banner.subtext ? (
                  <span
                    aria-hidden="true"
                    className="absolute inset-0 bg-gradient-to-t from-black/72 via-black/25 to-transparent"
                  />
                ) : null}
              </>
            ) : (
              <span
                aria-hidden="true"
                className="absolute inset-0"
                style={{
                  background:
                    "linear-gradient(135deg, var(--accent, #0284C7), color-mix(in oklab, var(--accent, #0284C7) 62%, #000))",
                }}
              />
            )}

            {banner.headline || banner.subtext || banner.code ? (
              <div className="relative flex flex-col items-start gap-1 p-4">
                {banner.headline ? (
                  <h3 className="text-[0.9375rem] leading-tight font-semibold text-balance text-white drop-shadow">
                    {banner.headline}
                  </h3>
                ) : null}
                {banner.subtext ? (
                  <p className="text-[0.75rem] leading-snug text-white/85 drop-shadow">
                    {banner.subtext}
                  </p>
                ) : null}
                {banner.code ? (
                  <span className="num mt-0.5 rounded-md bg-white/95 px-2 py-0.5 text-[0.6875rem] font-bold tracking-wide text-black">
                    {banner.code}
                  </span>
                ) : null}
              </div>
            ) : null}
          </article>
        ))}
      </div>

      {many ? (
        <div className="mt-2 flex items-center justify-center gap-1.5">
          {banners.map((banner, i) => (
            <button
              key={banner.id}
              type="button"
              aria-label={`Show banner ${i + 1}`}
              aria-current={i === index}
              onClick={() => {
                setHeld(true);
                const rail = railRef.current;
                rail?.scrollTo({ left: i * rail.clientWidth, behavior: "smooth" });
              }}
              className={`h-1.5 rounded-full transition-all ${
                i === index
                  ? "w-4 bg-[var(--accent,theme(colors.gray.700))]"
                  : "w-1.5 bg-line-strong"
              }`}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}
