"use client";

import { clsx } from "clsx";
import { useTheme } from "@/components/providers/AppProviders";
import { useI18n } from "@/components/providers/AppProviders";
import { ThemeSelector } from "@/components/ui/ThemeSelector";
import { LanguageToggle } from "@/components/ui/LanguageToggle";

interface Props {
  userName?: string;
  avatar?: string;
  lastUpdate?: Date;
}

export function Header({ userName, avatar, lastUpdate }: Props) {
  const { config } = useTheme();
  const { tr } = useI18n();

  const timeSince = lastUpdate
    ? Math.floor((Date.now() - lastUpdate.getTime()) / 60000)
    : null;

  const updateLabel =
    timeSince === null
      ? ""
      : timeSince === 0
      ? tr.time.justNow
      : tr.time.minutesAgo.replace("{n}", String(timeSince));

  return (
    <header
      className={clsx(
        "flex items-center justify-between px-6 py-3",
        config.surface,
        "border-b",
        config.border
      )}
    >
      <div className="flex items-center gap-3">
        {avatar && (
          <img src={avatar} alt={userName} className="w-8 h-8 rounded-full" />
        )}
        <div>
          <p className={clsx("font-semibold", config.text)}>{userName ?? "Fitbit"}</p>
          {updateLabel && (
            <p className={clsx("text-xs opacity-50", config.text)}>
              {tr.time.lastUpdate}: {updateLabel}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-4">
        <ThemeSelector />
        <LanguageToggle />
        <form action="/api/auth/logout" method="POST">
          <button
            type="submit"
            className={clsx(
              "text-xs opacity-60 hover:opacity-100 transition-opacity",
              config.text
            )}
          >
            {tr.nav.logout}
          </button>
        </form>
      </div>
    </header>
  );
}
