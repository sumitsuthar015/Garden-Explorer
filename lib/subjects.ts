import type { LocationCategory } from "@/lib/constants";

/**
 * Kid-facing colour identity for each learning category, plus the three big
 * subjects the trails teach: general science, logic and coding.
 * Class names are written out in full so Tailwind can see them.
 */

export interface CategoryTheme {
  /** Soft background wash for tiles and banners. */
  gradient: string;
  /** Small label chip. */
  chip: string;
  /** Solid accent (dots, bars). */
  solid: string;
}

export const CATEGORY_THEME: Record<LocationCategory, CategoryTheme> = {
  plants: {
    gradient: "from-lime-100 via-green-100 to-emerald-200",
    chip: "bg-green-100 text-green-800",
    solid: "bg-green-500",
  },
  animals: {
    gradient: "from-amber-100 via-orange-100 to-orange-200",
    chip: "bg-orange-100 text-orange-800",
    solid: "bg-orange-500",
  },
  science: {
    gradient: "from-sky-100 via-cyan-100 to-sky-200",
    chip: "bg-sky-100 text-sky-800",
    solid: "bg-sky-500",
  },
  environment: {
    gradient: "from-teal-100 via-emerald-100 to-teal-200",
    chip: "bg-teal-100 text-teal-800",
    solid: "bg-teal-500",
  },
  "garden-knowledge": {
    gradient: "from-yellow-100 via-amber-100 to-yellow-200",
    chip: "bg-yellow-100 text-yellow-800",
    solid: "bg-yellow-500",
  },
  logic: {
    gradient: "from-violet-100 via-purple-100 to-fuchsia-200",
    chip: "bg-violet-100 text-violet-800",
    solid: "bg-violet-500",
  },
  observation: {
    gradient: "from-pink-100 via-rose-100 to-pink-200",
    chip: "bg-pink-100 text-pink-800",
    solid: "bg-pink-500",
  },
  coding: {
    gradient: "from-indigo-100 via-blue-100 to-cyan-200",
    chip: "bg-indigo-100 text-indigo-800",
    solid: "bg-indigo-500",
  },
};

export function categoryTheme(category: string): CategoryTheme {
  return CATEGORY_THEME[category as LocationCategory] ?? CATEGORY_THEME.plants;
}

export interface Subject {
  key: "science" | "logic" | "coding";
  label: string;
  icon: string;
  blurb: string;
  examples: readonly string[];
  href: string;
  /** Card styling. */
  card: string;
  iconBg: string;
  accent: string;
}

export const SUBJECTS: readonly Subject[] = [
  {
    key: "science",
    label: "Science",
    icon: "🔬",
    blurb: "Plants, bugs, water, soil and sunshine — find out how nature really works.",
    examples: ["🍃 Leaf food factories", "🛝 Forces & friction", "🌧️ The monsoon"],
    href: "/explore",
    card: "from-sky-100 via-cyan-50 to-emerald-100 border-sky-200",
    iconBg: "bg-sky-500",
    accent: "text-sky-700",
  },
  {
    key: "logic",
    label: "Logic",
    icon: "🧩",
    blurb: "Spot patterns, crack riddles and think one step ahead, like a detective.",
    examples: ["🔢 Number patterns", "🕵️ Detective riddles", "🔺 Strong shapes"],
    href: "/explore?category=logic",
    card: "from-violet-100 via-fuchsia-50 to-pink-100 border-violet-200",
    iconBg: "bg-violet-500",
    accent: "text-violet-700",
  },
  {
    key: "coding",
    label: "Coding",
    icon: "💻",
    blurb: "Think like a computer: step-by-step instructions, loops, bugs and binary.",
    examples: ["🤖 Algorithms", "🔁 Loops", "💡 Binary code"],
    href: "/explore?category=coding",
    card: "from-indigo-100 via-blue-50 to-cyan-100 border-indigo-200",
    iconBg: "bg-indigo-500",
    accent: "text-indigo-700",
  },
];

const TRAIL_GRADIENTS = [
  "from-sky-200 via-cyan-100 to-emerald-200",
  "from-amber-200 via-orange-100 to-pink-200",
  "from-violet-200 via-fuchsia-100 to-sky-200",
  "from-lime-200 via-emerald-100 to-teal-200",
  "from-rose-200 via-orange-100 to-amber-200",
];

/** A cheerful gradient of its own for each trail, stable for its slug. */
export function trailGradient(slug: string): string {
  let hash = 0;
  for (const char of slug) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return TRAIL_GRADIENTS[hash % TRAIL_GRADIENTS.length];
}
