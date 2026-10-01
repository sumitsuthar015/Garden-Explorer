import Image from "next/image";
import {
  BookOpen,
  Eye,
  FlaskConical,
  Info,
  Lightbulb,
  Megaphone,
  Play,
  Search,
  Sparkles,
  Volume2,
} from "lucide-react";

import type { ContentBlockType } from "@/lib/constants";
import type { PublicContentBlock } from "@/db/queries/locations";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/**
 * One attractive learning card.
 *
 * Content is rendered as plain text paragraphs — never as raw HTML — so admin
 * input cannot introduce script or markup into the visitor's page (XSS safe by
 * construction). Paragraph breaks come from blank lines.
 */

interface BlockPresentation {
  label: string;
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  tone: "default" | "science" | "observe" | "think" | "fact" | "callout";
  /** Big friendly picture shown beside the title for young readers. */
  emoji: string;
}

const PRESENTATION: Record<ContentBlockType, BlockPresentation> = {
  text: { label: "About this place", icon: BookOpen, tone: "default", emoji: "📖" },
  image: { label: "Look closely", icon: Eye, tone: "observe", emoji: "🔍" },
  fact: { label: "Fact", icon: Info, tone: "fact", emoji: "📌" },
  did_you_know: { label: "Did You Know?", icon: Sparkles, tone: "fact", emoji: "🤯" },
  science: { label: "Science Discovery", icon: FlaskConical, tone: "science", emoji: "🔬" },
  observation: { label: "Observe", icon: Search, tone: "observe", emoji: "👀" },
  thinking: { label: "Think", icon: Lightbulb, tone: "think", emoji: "💭" },
  activity: { label: "Try It", icon: Play, tone: "observe", emoji: "🙌" },
  quiz: { label: "Quick Quiz", icon: Lightbulb, tone: "think", emoji: "❓" },
  callout: { label: "Good to know", icon: Megaphone, tone: "callout", emoji: "📣" },
  video: { label: "Watch", icon: Play, tone: "default", emoji: "🎬" },
  audio: { label: "Listen", icon: Volume2, tone: "default", emoji: "🎧" },
};

const TONE_CLASSES: Record<BlockPresentation["tone"], string> = {
  default: "border-emerald-100 bg-card",
  science: "border-sky-200 bg-gradient-to-br from-sky-50 to-white",
  observe: "border-green-200 bg-gradient-to-br from-green-50 to-white",
  think: "border-amber-200 bg-gradient-to-br from-amber-50 to-white",
  fact: "border-violet-200 bg-gradient-to-br from-violet-50 to-white",
  callout: "border-orange-200 bg-gradient-to-br from-orange-50 to-white",
};

interface ContentBlockCardProps {
  block: PublicContentBlock;
  className?: string;
  style?: React.CSSProperties;
}

export function ContentBlockCard({ block, className, style }: ContentBlockCardProps) {
  const presentation = PRESENTATION[block.type] ?? PRESENTATION.text;
  const Icon = presentation.icon;
  const title = block.title?.trim() || presentation.label;

  return (
    <Card
      style={style}
      className={cn(
        "group overflow-hidden rounded-3xl border-2 p-5 sm:p-6",
        TONE_CLASSES[presentation.tone],
        className,
      )}
    >
      <header className="flex items-center gap-3">
        <span
          aria-hidden="true"
          className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-white text-2xl shadow-soft ring-1 ring-black/5 transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-110"
        >
          {presentation.emoji}
        </span>
        <div className="min-w-0">
          {title.toLowerCase() !== presentation.label.toLowerCase() ? (
            <p className="inline-flex items-center gap-1.5 text-xs font-bold tracking-wide text-primary uppercase">
              <Icon className="size-3.5" aria-hidden />
              {presentation.label}
            </p>
          ) : null}
          <h3 className="font-heading text-lg leading-snug font-bold text-balance">{title}</h3>
        </div>
      </header>

      {block.mediaUrl && (block.type === "image" || block.type === "text") ? (
        <figure className="mt-4">
          <div className="relative aspect-[16/10] w-full overflow-hidden rounded-lg bg-muted">
            <Image
              src={block.mediaUrl}
              alt={block.mediaAlt ?? title}
              fill
              sizes="(max-width: 768px) 100vw, 720px"
              className="object-cover"
              loading="lazy"
            />
          </div>
          {block.mediaCaption ? (
            <figcaption className="mt-2 text-xs leading-relaxed text-muted-foreground">
              {block.mediaCaption}
            </figcaption>
          ) : null}
        </figure>
      ) : null}

      {block.mediaUrl && block.type === "video" ? (
        <div className="mt-4 overflow-hidden rounded-lg bg-black">
          {/* Captions are the admin's responsibility and are documented on /accessibility. */}
          <video controls preload="metadata" poster={block.mediaAlt ?? undefined} className="h-auto w-full">
            <source src={block.mediaUrl} />
            Your browser cannot play this video.
          </video>
        </div>
      ) : null}

      {block.mediaUrl && block.type === "audio" ? (
        <div className="mt-4">
          <audio controls preload="metadata" className="w-full">
            <source src={block.mediaUrl} />
            Your browser cannot play this audio.
          </audio>
          {block.mediaCaption ? (
            <p className="mt-2 text-xs text-muted-foreground">{block.mediaCaption}</p>
          ) : null}
        </div>
      ) : null}

      {block.body.trim() ? (
        <div className="mt-3 flex flex-col gap-3">
          {block.body
            .split(/\n{2,}/)
            .map((paragraph) => paragraph.trim())
            .filter(Boolean)
            .map((paragraph, index) => (
              <p key={index} className="text-base leading-relaxed text-foreground/90">
                {paragraph}
              </p>
            ))}
        </div>
      ) : null}
    </Card>
  );
}
