"use client";

import * as React from "react";
import { Volume2, VolumeX } from "lucide-react";

import { isSoundOn, playSound, setSoundOn, subscribeSound } from "@/lib/sounds";
import { cn } from "@/lib/utils";

/** Header switch for the learning-flow sound effects. Remembered on this device. */
export function SoundToggle({ className }: { className?: string }) {
  const on = React.useSyncExternalStore(subscribeSound, isSoundOn, () => true);

  return (
    <button
      type="button"
      onClick={() => {
        setSoundOn(!on);
        if (!on) playSound("pop");
      }}
      aria-pressed={on}
      aria-label={on ? "Sound effects on — turn off" : "Sound effects off — turn on"}
      title={on ? "Sound effects on" : "Sound effects off"}
      className={cn(
        "flex size-9 items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-soft transition-[transform,color] hover:scale-110 hover:text-foreground active:scale-95",
        className,
      )}
    >
      {on ? <Volume2 className="size-4" aria-hidden="true" /> : <VolumeX className="size-4" aria-hidden="true" />}
    </button>
  );
}
