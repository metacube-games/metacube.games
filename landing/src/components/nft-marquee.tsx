"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";

const TOKEN_IDS = [
  5270, 30, 99, 51, 3108, 66, 6423, 14, 103, 3936, 9, 126, 4541, 4926, 5273, 44,
  5, 5788, 3411, 3212, 41, 195, 7251, 3339, 6496, 108, 3, 6769, 6602, 5361, 13,
  8, 23, 5303, 38, 2933, 48, 22, 0, 31, 7549, 28, 61, 3240, 93, 4798, 5194, 55,
  15, 18, 4782, 6452, 5118, 117, 3596, 5397, 237, 67, 1, 52, 5271, 6366, 171,
  6216, 5174, 4833, 11, 34, 4911, 87, 17, 207, 4577, 59, 21, 2834, 6508, 2641,
  2,
];

export function NftMarquee() {
  const items = [...TOKEN_IDS, ...TOKEN_IDS];
  const stripRef = useRef<HTMLDivElement>(null);
  // Gate animations on eager images decoding so the boost doesn't fling un-decoded cards across the viewport; 4 s fallback prevents a slow URL from freezing the hero.
  const [ready, setReady] = useState(false);

  useLayoutEffect(() => {
    const strip = stripRef.current;
    if (!strip) return;
    const cards = Array.from(strip.querySelectorAll<HTMLImageElement>("img"));
    if (cards.length === 0) return;

    const positionAll = () => {
      const viewportCenter = window.innerWidth / 2;
      const radius = window.innerWidth;
      for (const card of cards) {
        const rect = card.getBoundingClientRect();
        const cardCenter = rect.left + rect.width / 2;
        const dx = Math.min(Math.abs(cardCenter - viewportCenter), radius);
        const drop = radius - Math.sqrt(radius * radius - dx * dx);
        card.style.transform = `translateY(${(-drop).toFixed(2)}px)`;
      }
    };

    // Sync position before first paint so the strip doesn't briefly render as a flat line before rAF kicks in.
    positionAll();

    let rafId = 0;
    let running = false;
    const tick = () => {
      positionAll();
      rafId = requestAnimationFrame(tick);
    };
    const start = () => {
      if (running) return;
      running = true;
      rafId = requestAnimationFrame(tick);
    };
    const stop = () => {
      if (!running) return;
      running = false;
      cancelAnimationFrame(rafId);
    };

    const onVisibility = () => {
      if (document.hidden) stop();
      else start();
    };
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !document.hidden) start();
        else stop();
      },
      { threshold: 0 },
    );
    io.observe(strip);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      stop();
      io.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  useEffect(() => {
    const strip = stripRef.current;
    if (!strip) return;
    const eagerImgs = Array.from(
      strip.querySelectorAll<HTMLImageElement>("img"),
    ).slice(0, TOKEN_IDS.length);
    if (eagerImgs.length === 0) {
      setReady(true);
      return;
    }
    let remaining = eagerImgs.length;
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      setReady(true);
    };
    const onOne = () => {
      remaining -= 1;
      if (remaining <= 0) finish();
    };
    for (const img of eagerImgs) {
      if (img.complete && img.naturalWidth > 0) {
        onOne();
      } else {
        img.addEventListener("load", onOne, { once: true });
        img.addEventListener("error", onOne, { once: true });
      }
    }
    const timeoutId = window.setTimeout(finish, 4000);
    return () => {
      window.clearTimeout(timeoutId);
      for (const img of eagerImgs) {
        img.removeEventListener("load", onOne);
        img.removeEventListener("error", onOne);
      }
    };
  }, []);

  return (
    <div className="relative w-screen overflow-x-clip">
      <div className={ready ? "animate-nft-marquee-boost" : ""}>
        <div
          ref={stripRef}
          className={`flex w-max gap-4 pt-8 pb-4 transition-opacity duration-300 ${ready ? "animate-nft-marquee opacity-100" : "opacity-0"
            }`}
        >
          {items.map((id, index) => {
            const inFirstHalf = index < TOKEN_IDS.length;
            return (
              <img
                key={`${id}-${index}`}
                src={`https://felts.xyz/v1/i/${id}.png`}
                alt=""
                width={200}
                height={300}
                loading={inFirstHalf ? "eager" : "lazy"}
                fetchPriority={index === 0 ? "high" : "auto"}
                className="h-48 w-32 sm:h-56 sm:w-40 md:h-64 md:w-44 shrink-0 rounded-md object-cover"
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
