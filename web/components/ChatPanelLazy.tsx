"use client";

import { useState, useEffect } from "react";
import ChatPanel from "./ChatPanel";

type ChatPanelProps = {
  accountId?: string;
  campaignId?: string;
  siteUrl?: string;
  ga4PropertyId?: string;
  contextLabel: string;
  suggestions?: string[];
};

export function ChatPanelLazy(props: ChatPanelProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Patrón estándar "recién montado en el cliente" para evitar mismatch de hidratación —
    // no es un bug, la regla react-hooks/set-state-in-effect no distingue este caso legítimo.
    // eslint-disable-next-line react-hooks/set-state-in-effect
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
