"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { LocationOption } from "@/lib/location-types";

type HomeScrollHeroProps = {
  canAccessWholesale: boolean;
};

type FoodParticle = {
  column: number;
  row: number;
  left: number;
  top: number;
  size: number;
  driftX: number;
  driftY: number;
  rotate: number;
  targetX: number;
  targetY: number;
};

const particles: FoodParticle[] = [
  { column: 0, row: 0, left: 43, top: 17, size: 8.2, driftX: -34, driftY: -18, rotate: -28, targetX: -32, targetY: -14 },
  { column: 1, row: 0, left: 55, top: 12, size: 8.8, driftX: 18, driftY: -30, rotate: 22, targetX: -12, targetY: -21 },
  { column: 2, row: 0, left: 68, top: 20, size: 8, driftX: 38, driftY: -12, rotate: 48, targetX: 16, targetY: -18 },
  { column: 3, row: 0, left: 82, top: 15, size: 7.5, driftX: 31, driftY: -29, rotate: -42, targetX: 37, targetY: -12 },
  { column: 0, row: 1, left: 48, top: 36, size: 7.7, driftX: -43, driftY: 3, rotate: 38, targetX: -43, targetY: 2 },
  { column: 1, row: 1, left: 62, top: 31, size: 8.4, driftX: 11, driftY: -9, rotate: -31, targetX: -18, targetY: 1 },
  { column: 2, row: 1, left: 76, top: 36, size: 9, driftX: 36, driftY: 6, rotate: 27, targetX: 11, targetY: -2 },
  { column: 3, row: 1, left: 89, top: 31, size: 7.2, driftX: 28, driftY: 14, rotate: -24, targetX: 39, targetY: 3 },
  { column: 0, row: 2, left: 52, top: 52, size: 8.8, driftX: -28, driftY: 20, rotate: 18, targetX: -28, targetY: 12 },
  { column: 1, row: 2, left: 69, top: 49, size: 8.5, driftX: 2, driftY: 24, rotate: -18, targetX: 1, targetY: 10 },
  { column: 2, row: 2, left: 83, top: 51, size: 8.3, driftX: 29, driftY: 28, rotate: 39, targetX: 27, targetY: 14 },
  { column: 3, row: 2, left: 94, top: 44, size: 7.8, driftX: 37, driftY: 12, rotate: -33, targetX: 45, targetY: 8 },
];

async function loadLocationOptions(level: "provinces" | "districts" | "settlements", parentId?: string) {
  const search = new URLSearchParams({ level });
  if (parentId) search.set("parentId", parentId);
  const response = await fetch(`/api/locations?${search.toString()}`);
  const payload = (await response.json()) as { items?: LocationOption[]; error?: string };
  if (!response.ok) throw new Error(payload.error ?? "Konumlar yüklenemedi.");
  return payload.items ?? [];
}

function PinIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 21s7-6.1 7-12A7 7 0 1 0 5 9c0 5.9 7 12 7 12Z" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="12" cy="9" r="2.25" fill="none" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 12h14M14 7l5 5-5 5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
    </svg>
  );
}

export function HomeScrollHero({ canAccessWholesale }: HomeScrollHeroProps) {
  const router = useRouter();
  const storyRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const autoStoryTimersRef = useRef<number[]>([]);
  const autoStoryActiveRef = useRef(false);
  const [provinces, setProvinces] = useState<LocationOption[]>([]);
  const [districts, setDistricts] = useState<LocationOption[]>([]);
  const [neighborhoods, setNeighborhoods] = useState<LocationOption[]>([]);
  const [city, setCity] = useState("");
  const [district, setDistrict] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [locationLoading, setLocationLoading] = useState(true);
  const [locationError, setLocationError] = useState("");

  const stopAutoStory = useCallback(() => {
    for (const timer of autoStoryTimersRef.current) window.clearTimeout(timer);
    autoStoryTimersRef.current = [];
    autoStoryActiveRef.current = false;
  }, []);

  useEffect(() => {
    const interrupt = () => {
      if (autoStoryActiveRef.current) stopAutoStory();
    };
    window.addEventListener("wheel", interrupt, { passive: true });
    window.addEventListener("touchstart", interrupt, { passive: true });
    window.addEventListener("pointerdown", interrupt, { passive: true });
    window.addEventListener("keydown", interrupt);
    return () => {
      stopAutoStory();
      window.removeEventListener("wheel", interrupt);
      window.removeEventListener("touchstart", interrupt);
      window.removeEventListener("pointerdown", interrupt);
      window.removeEventListener("keydown", interrupt);
    };
  }, [stopAutoStory]);

  useEffect(() => {
    let active = true;
    loadLocationOptions("provinces")
      .then((items) => { if (active) setProvinces(items); })
      .catch((error: Error) => { if (active) setLocationError(error.message); })
      .finally(() => { if (active) setLocationLoading(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const story = storyRef.current;
    const stage = stageRef.current;
    if (!story || !stage || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let cleanup = () => {};
    let cancelled = false;

    void Promise.all([import("gsap"), import("gsap/ScrollTrigger")]).then(([gsapModule, scrollModule]) => {
      if (cancelled) return;
      const gsap = gsapModule.gsap;
      const ScrollTrigger = scrollModule.ScrollTrigger;
      gsap.registerPlugin(ScrollTrigger);

      const context = gsap.context(() => {
        const food = gsap.utils.toArray<HTMLElement>("[data-hero-food]");
        const intro = stage.querySelector("[data-hero-intro]");
        const promo = stage.querySelector("[data-hero-promo]");
        const cue = stage.querySelector("[data-hero-cue]");
        const backdrop = stage.querySelector("[data-hero-backdrop]");
        const cream = stage.querySelector("[data-hero-cream]");
        const location = stage.querySelector("[data-hero-location]");
        const storySteps = stage.querySelector("[data-hero-story-steps]");
        const stepOne = stage.querySelector("[data-hero-story-step='1']");
        const stepTwo = stage.querySelector("[data-hero-story-step='2']");
        const stepThree = stage.querySelector("[data-hero-story-step='3']");

        gsap.set(location, { autoAlpha: 0, y: 56 });
        gsap.set(cream, { yPercent: 104 });
        gsap.set(food, { transformOrigin: "50% 50%", force3D: true });
        gsap.set(storySteps, { autoAlpha: 0 });
        gsap.set([stepOne, stepTwo, stepThree], { autoAlpha: 0, y: 18 });

        const timeline = gsap.timeline({ defaults: { ease: "none" } });
        timeline
          .to(food, {
            x: (_, element) => Number((element as HTMLElement).dataset.driftX ?? 0),
            y: (_, element) => Number((element as HTMLElement).dataset.driftY ?? 0),
            rotation: (_, element) => Number((element as HTMLElement).dataset.rotate ?? 0),
            scale: 1.09,
            stagger: 0.012,
            duration: 0.42,
          }, 0.08)
          .to(intro, { autoAlpha: 0, y: -32, duration: 0.34 }, 0.55)
          .to(promo, { autoAlpha: 0, y: -16, duration: 0.28 }, 0.66)
          .to(cue, { autoAlpha: 0, y: 12, duration: 0.26 }, 0.62)
          .to(storySteps, { autoAlpha: 1, duration: 0.14 }, 0.72)
          .to(stepOne, { autoAlpha: 1, y: 0, duration: 0.26, ease: "power1.out" }, 0.78)
          // The gaps between each entrance and exit are deliberate sticky read phases.
          .to(stepOne, { autoAlpha: 0, y: -14, duration: 0.2, ease: "power1.in" }, 1.36)
          .to(stepTwo, { autoAlpha: 1, y: 0, duration: 0.26, ease: "power1.out" }, 1.56)
          .to(stepTwo, { autoAlpha: 0, y: -14, duration: 0.2, ease: "power1.in" }, 2.14)
          .to(stepThree, { autoAlpha: 1, y: 0, duration: 0.26, ease: "power1.out" }, 2.34)
          .to(stepThree, { autoAlpha: 0, y: -14, duration: 0.2, ease: "power1.in" }, 2.94)
          .to(storySteps, { autoAlpha: 0, duration: 0.14 }, 3.1)
          .to(food, {
            x: (_, element) => {
              const item = element as HTMLElement;
              return stage.clientWidth * 0.76 - item.offsetLeft - item.offsetWidth / 2 + Number(item.dataset.targetX ?? 0);
            },
            y: (_, element) => {
              const item = element as HTMLElement;
              return stage.clientHeight * 0.76 - item.offsetTop - item.offsetHeight / 2 + Number(item.dataset.targetY ?? 0);
            },
            rotation: (_, element) => Number((element as HTMLElement).dataset.rotate ?? 0) * 2.4,
            scale: 0.24,
            stagger: 0.016,
            duration: 2.2,
          }, 0.62)
          .to(backdrop, { scale: 1.075, yPercent: -1.8, duration: 2.12 }, 0.65)
          .to(food, { autoAlpha: 0, duration: 0.22 }, 2.82)
          .to(cream, { yPercent: 0, duration: 0.5, ease: "power2.inOut" }, 2.86)
          .to(backdrop, { autoAlpha: 0, duration: 0.3 }, 3.18)
          .to(location, { autoAlpha: 1, y: 0, pointerEvents: "auto", duration: 0.38, ease: "power2.out" }, 3.28);

        const trigger = ScrollTrigger.create({
          trigger: story,
          start: "top top",
          end: () => "+=" + Math.max(story.offsetHeight - window.innerHeight, 1),
          animation: timeline,
          scrub: 1.15,
          invalidateOnRefresh: true,
        });

        const refresh = () => ScrollTrigger.refresh();
        void document.fonts?.ready.then(refresh);
        window.addEventListener("load", refresh, { once: true });

        cleanup = () => {
          window.removeEventListener("load", refresh);
          trigger.kill();
          timeline.kill();
          context.revert();
        };
      }, story);
    });

    return () => {
      cancelled = true;
      cleanup();
    };
  }, []);

  function scrollToScene(progress: number) {
    const story = storyRef.current;
    if (!story) return;
    const start = story.getBoundingClientRect().top + window.scrollY;
    const distance = Math.max(story.offsetHeight - window.innerHeight, 0);
    window.scrollTo({ top: start + distance * progress, behavior: "smooth" });
  }

  function jumpToLocationPicker() {
    stopAutoStory();
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      document.querySelector<HTMLElement>("[data-hero-location]")?.scrollIntoView({ behavior: "auto", block: "center" });
      return;
    }
    scrollToScene(0.98);
  }

  function playHowItWorks() {
    stopAutoStory();
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      document.querySelector<HTMLElement>("[data-hero-story-steps]")?.scrollIntoView({ behavior: "auto", block: "center" });
      return;
    }

    autoStoryActiveRef.current = true;
    scrollToScene(0.33);
    const waypoints = [
      { delay: 1800, progress: 0.54 },
      { delay: 3600, progress: 0.76 },
      { delay: 5400, progress: 0.98 },
    ];
    autoStoryTimersRef.current = waypoints.map(({ delay, progress }) => window.setTimeout(() => {
      if (autoStoryActiveRef.current) scrollToScene(progress);
    }, delay));
    autoStoryTimersRef.current.push(window.setTimeout(() => {
      autoStoryActiveRef.current = false;
      autoStoryTimersRef.current = [];
    }, 6700));
  }

  function submitLocation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!city || !district || !neighborhood) return;
    const provinceItem = provinces.find((item) => item.id === city);
    const districtItem = districts.find((item) => item.id === district);
    const neighborhoodItem = neighborhoods.find((item) => item.id === neighborhood);
    if (!provinceItem || !districtItem || !neighborhoodItem) return;
    const search = new URLSearchParams({
      il: provinceItem.name,
      ilce: districtItem.name,
      mahalle: neighborhoodItem.id,
      mahalleAdi: neighborhoodItem.name,
    });
    router.push(`/magazalar?${search.toString()}`);
  }

  async function selectProvince(provinceId: string) {
    setCity(provinceId);
    setDistrict("");
    setNeighborhood("");
    setDistricts([]);
    setNeighborhoods([]);
    setLocationError("");
    if (!provinceId) return;
    setLocationLoading(true);
    try {
      setDistricts(await loadLocationOptions("districts", provinceId));
    } catch (error) {
      setLocationError(error instanceof Error ? error.message : "İlçeler yüklenemedi.");
    } finally {
      setLocationLoading(false);
    }
  }

  async function selectDistrict(districtId: string) {
    setDistrict(districtId);
    setNeighborhood("");
    setNeighborhoods([]);
    setLocationError("");
    if (!districtId) return;
    setLocationLoading(true);
    try {
      setNeighborhoods(await loadLocationOptions("settlements", districtId));
    } catch (error) {
      setLocationError(error instanceof Error ? error.message : "Mahalleler yüklenemedi.");
    } finally {
      setLocationLoading(false);
    }
  }

  return (
    <section ref={storyRef} className="f360-hero-story" aria-labelledby="hero-heading">
      <div ref={stageRef} className="f360-hero-stage">
        <div data-hero-backdrop className="f360-hero-backdrop">
          <Image
            src="/assets/fistik360/hero/hero-cinematic.png"
            alt="Kuruyemiş, kuru meyve ve lokumlarla hazırlanan doğal lezzet seçkisi"
            fill
            preload
            sizes="100vw"
            className="object-cover"
          />
          <div className="f360-hero-shade" />
        </div>

        <div data-hero-promo className="f360-promo" aria-label="Fıstık360 avantajları">
          <div className="f360-promo-track">
            <span>%0 Komisyon</span><i />
            <span>Yerel Esnafa Tam Destek</span><i />
            <span>Mahalleye Özel</span><i />
            <span>Güvenli Alışveriş</span>
          </div>
        </div>

        <div data-hero-intro className="f360-hero-intro">
          <p className="f360-hero-kicker">Mahallenden sofrana</p>
          <h1 id="hero-heading">
            Mahallenden
            <span>Doğal</span>
            Lezzetler
          </h1>
          <p className="f360-hero-copy">Taptaze kuruyemiş, kuru meyve ve doğal atıştırmalıklar kapında.</p>
          <div className="f360-hero-actions">
            <button type="button" className="f360-button-primary" onClick={jumpToLocationPicker}>
              Mahalleni Keşfet <ArrowIcon />
            </button>
            <button type="button" className="f360-button-ghost" onClick={playHowItWorks}>
              <span className="f360-play" aria-hidden="true">▶</span> Nasıl Çalışır?
            </button>
          </div>
          <div className="f360-trust-row" aria-label="Fıstık360 güvenceleri">
            <div><strong>%0</strong><span>Komisyon</span></div>
            <div><strong>Yerel</strong><span>Esnafa destek</span></div>
            <div><strong>Hızlı</strong><span>Mahallene teslimat</span></div>
          </div>
          <Link className="f360-seller-link" href={canAccessWholesale ? "/toptan" : "/magaza-ac"}>
            {canAccessWholesale ? "Toptan pazarına geç" : "Satıcı mısın? Mağazanı aç"} <ArrowIcon />
          </Link>
        </div>

        <div data-hero-story-steps className="f360-story-steps" aria-label="Fıstık360 üç adımda nasıl çalışır">
          <article data-hero-story-step="1" className="f360-story-step">
            <span className="f360-story-number">01 / 03</span>
            <p className="f360-story-kicker">Fıstık360 nasıl çalışır?</p>
            <h2>Mahalleni seç,<br /><em>yakınındaki esnafa ulaş.</em></h2>
            <p>İl, ilçe ve mahalleni belirle. Yalnızca adresine gerçekten teslimat yapan kuruyemişçileri gösterelim.</p>
          </article>
          <article data-hero-story-step="2" className="f360-story-step">
            <span className="f360-story-number">02 / 03</span>
            <p className="f360-story-kicker">Ürün ve mağaza deneyimi</p>
            <h2>Mağazayı aç,<br /><em>taze seçkiyi keşfet.</em></h2>
            <p>Kuruyemişleri, lokumları ve mağazanın hazırladığı paketleri fiyatı ve satış ölçüsüyle birlikte incele.</p>
          </article>
          <article data-hero-story-step="3" className="f360-story-step">
            <span className="f360-story-number">03 / 03</span>
            <p className="f360-story-kicker">Sipariş mantığı</p>
            <h2>Tek mağazadan seç,<br /><em>sepetini tamamla.</em></h2>
            <p>Ürün ve paketlerini aynı mağazalı sepete ekle; teslimat ve ödeme seçeneklerini güvenle tamamla.</p>
          </article>
        </div>

        <div className="f360-food-layer" aria-hidden="true">
          {particles.map((particle, index) => (
            <span
              key={`${particle.column}-${particle.row}-${index}`}
              data-hero-food
              data-drift-x={particle.driftX}
              data-drift-y={particle.driftY}
              data-rotate={particle.rotate}
              data-target-x={particle.targetX}
              data-target-y={particle.targetY}
              className="f360-food-particle"
              style={{
                left: `${particle.left}%`,
                top: `${particle.top}%`,
                width: `${particle.size}vw`,
              }}
            >
              <span style={{ backgroundPosition: `${particle.column * (100 / 3)}% ${particle.row * 50}%` }} />
            </span>
          ))}
        </div>

        <div data-hero-cream className="f360-cream-layer" aria-hidden="true">
          <svg viewBox="0 0 1440 130" preserveAspectRatio="none">
            <path d="M0 67C164 16 285 113 482 82c193-31 268 37 461 6 191-31 321-115 497-48v90H0Z" fill="currentColor" />
          </svg>
        </div>

        <div data-hero-location className="f360-location-scene">
          <div className="f360-location-glow f360-location-glow-left" aria-hidden="true" />
          <div className="f360-location-glow f360-location-glow-right" aria-hidden="true" />
          <div className="f360-location-content">
            <p className="f360-location-kicker"><span>→</span> Mahalleni seç</p>
            <h2>Mahalleni Seç,<br /><span>Lezzeti Keşfet</span></h2>
            <p>İl, ilçe ve mahalleni seç; sana gerçekten teslimat yapan kuruyemişçileri listeleyelim.</p>

            <form className="f360-location-form" onSubmit={submitLocation}>
              <label>
                <span>İl</span>
                <i><PinIcon /></i>
                <select
                  value={city}
                  onChange={(event) => void selectProvince(event.target.value)}
                  disabled={locationLoading && provinces.length === 0}
                  required
                >
                  <option value="">{locationLoading && provinces.length === 0 ? "İller yükleniyor..." : "İl Seçin"}</option>
                  {provinces.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                </select>
              </label>
              <label>
                <span>İlçe</span>
                <i><PinIcon /></i>
                <select
                  value={district}
                  onChange={(event) => void selectDistrict(event.target.value)}
                  disabled={!city || locationLoading}
                  required
                >
                  <option value="">{locationLoading && city && !districts.length ? "İlçeler yükleniyor..." : "İlçe Seçin"}</option>
                  {districts.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                </select>
              </label>
              <label>
                <span>Mahalle</span>
                <i><PinIcon /></i>
                <select value={neighborhood} onChange={(event) => setNeighborhood(event.target.value)} disabled={!district || locationLoading} required>
                  <option value="">{locationLoading && district && !neighborhoods.length ? "Mahalleler yükleniyor..." : "Mahalle Seçin"}</option>
                  {neighborhoods.map((item) => <option key={item.id} value={item.id}>{item.name} Mahallesi</option>)}
                </select>
              </label>
              <button type="submit" disabled={!neighborhood}>
                Mahallemi Göster <ArrowIcon />
              </button>
            </form>
            {locationError && <p className="f360-location-error" role="alert">{locationError}</p>}

            <div className="f360-location-promises">
              <span>Yerel esnaf</span><i />
              <span>%0 komisyon</span><i />
              <span>Doğal ve taze</span><i />
              <span>Güvenli alışveriş</span>
            </div>
          </div>
        </div>

        <button data-hero-cue type="button" className="f360-scroll-cue" onClick={playHowItWorks} aria-label="Fıstık360 nasıl çalışır anlatımını başlat">
          <span /><small>Aşağı Kaydır</small>
        </button>
      </div>
    </section>
  );
}
