"use client";

import { useState, useEffect } from "react";
import ChatPanel from "./ChatPanel";

type ChatPanelProps = {
  accountId?: string;
  campaignId?: string;
  siteUrl?: string;
  contextLabel: string;
  suggestions?: string[];
};

export function ChatPanelLazy(props: ChatPanelProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="rounded-lg border border-border bg-surface p-6 text-sm text-muted">
        Cargando chat…
      </div>
    );
  }

  return <ChatPanel {...props} />;
}
