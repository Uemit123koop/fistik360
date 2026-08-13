import type { IngredientId } from "@/lib/bundle-content";

interface IconSpec {
  gradientFrom: string;
  gradientTo: string;
  render: (gradientId: string) => React.ReactNode;
}

const ICONS: Record<IngredientId, IconSpec> = {
  "antep-fistigi": {
    gradientFrom: "#a9c98a",
    gradientTo: "#5f8a4a",
    render: (id) => (
      <>
        <path d="M24 6c7 0 10.5 6 10.5 14.5S31 40 24 40s-10.5-11-10.5-19.5S17 6 24 6Z" fill={`url(#${id})`} />
        <path d="M24 6v34" stroke="#3d5c30" strokeWidth="1.4" strokeLinecap="round" opacity=".55" />
        <path d="M18 14c1.6 1.4 2.4 3 2.4 5M30 14c-1.6 1.4-2.4 3-2.4 5" stroke="#f3f0dc" strokeWidth="1.4" strokeLinecap="round" opacity=".6" />
      </>
    ),
  },
  kaju: {
    gradientFrom: "#f4e2b8",
    gradientTo: "#d9ae5f",
    render: (id) => (
      <path
        d="M15 30c-3-4-3-11 2-16 4-4 9-4 12-1 4 4 2 9-1 10 4 1 7 6 4 11-3 5-9 6-13 3-2-1.5-3-4.5-4-7Z"
        fill={`url(#${id})`}
      />
    ),
  },
  badem: {
    gradientFrom: "#e6c48f",
    gradientTo: "#a9793f",
    render: (id) => <path d="M24 6c6 0 9 8 9 17s-4 19-9 19-9-10-9-19S18 6 24 6Z" fill={`url(#${id})`} />,
  },
  findik: {
    gradientFrom: "#c9906a",
    gradientTo: "#8a4f30",
    render: (id) => (
      <>
        <circle cx="24" cy="25" r="15" fill={`url(#${id})`} />
        <path d="M12 18c4-3 20-3 24 0" stroke="#f3e6d8" strokeWidth="1.6" strokeLinecap="round" opacity=".55" />
      </>
    ),
  },
  "kabak-cekirdegi": {
    gradientFrom: "#dce7b0",
    gradientTo: "#a9c06a",
    render: (id) => <path d="M24 5c8 3 12 15 8 25-2 6-5 11-8 13-3-2-6-7-8-13-4-10 0-22 8-25Z" fill={`url(#${id})`} />,
  },
  "kuru-kayisi": {
    gradientFrom: "#f2b46a",
    gradientTo: "#d17a2f",
    render: (id) => (
      <>
        <circle cx="24" cy="24" r="16" fill={`url(#${id})`} />
        <path d="M24 10c-2 6-2 22 0 28" stroke="#a8541c" strokeWidth="1.6" strokeLinecap="round" opacity=".5" />
      </>
    ),
  },
  "kuru-incir": {
    gradientFrom: "#c9a887",
    gradientTo: "#7c5638",
    render: (id) => (
      <>
        <path d="M24 8c9 2 14 10 14 18s-6 14-14 14-14-6-14-14S15 10 24 8Z" fill={`url(#${id})`} />
        <circle cx="20" cy="22" r="1.4" fill="#f2e6c8" opacity=".7" />
        <circle cx="26" cy="26" r="1.4" fill="#f2e6c8" opacity=".7" />
        <circle cx="22" cy="30" r="1.4" fill="#f2e6c8" opacity=".7" />
        <circle cx="28" cy="19" r="1.4" fill="#f2e6c8" opacity=".7" />
      </>
    ),
  },
  "ceviz-ici": {
    gradientFrom: "#d9b98a",
    gradientTo: "#9a6a3c",
    render: (id) => (
      <>
        <path d="M24 6c8 0 13 8 13 17s-5 19-13 19-13-10-13-19S16 6 24 6Z" fill={`url(#${id})`} />
        <path d="M24 8v34M14 24c4-2 6-6 10-6s6 4 10 6" stroke="#6b4423" strokeWidth="1.3" strokeLinecap="round" opacity=".45" />
      </>
    ),
  },
};

export function IngredientIcon({ id, className = "h-full w-full" }: { id: IngredientId; className?: string }) {
  const spec = ICONS[id];
  const gradientId = `ing-grad-${id}`;
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <defs>
        <radialGradient id={gradientId} cx="35%" cy="30%" r="75%">
          <stop offset="0%" stopColor={spec.gradientFrom} />
          <stop offset="100%" stopColor={spec.gradientTo} />
        </radialGradient>
      </defs>
      {spec.render(gradientId)}
    </svg>
  );
}
