import { ExternalLink } from "lucide-react";

interface ServiceQuickLink {
  readonly label: string;
  readonly href: string;
}

const SERVICE_QUICK_LINKS: Record<string, ReadonlyArray<ServiceQuickLink>> = {
  kkaiapi: [
    { label: "官网", href: "https://kkaiapi.com/" },
    { label: "API 文档", href: "https://kkaiapi.com/docs" },
    { label: "模型/价格", href: "https://kkaiapi.com/models" },
  ],
  openrouter: [
    { label: "API Keys", href: "https://openrouter.ai/keys" },
    { label: "模型", href: "https://openrouter.ai/models" },
    { label: "文档", href: "https://openrouter.ai/docs/api-reference/overview" },
  ],
};

export function getServiceQuickLinks(serviceId: string): ReadonlyArray<ServiceQuickLink> {
  return SERVICE_QUICK_LINKS[serviceId] ?? [];
}

export function ServiceQuickLinks({
  serviceId,
  variant = "detail",
  className = "",
}: {
  readonly serviceId: string;
  readonly variant?: "card" | "detail";
  readonly className?: string;
}) {
  const links = getServiceQuickLinks(serviceId);
  if (links.length === 0) return null;

  const compact = variant === "card";
  return (
    <div
      className={[
        "flex flex-wrap items-center gap-1.5 text-muted-foreground/70",
        compact ? "text-[11px]" : "text-xs",
        className,
      ].filter(Boolean).join(" ")}
    >
      {!compact && <span className="mr-0.5">配置入口</span>}
      {links.map((link) => (
        <a
          key={link.href}
          href={link.href}
          target="_blank"
          rel="noreferrer"
          onClick={(event) => event.stopPropagation()}
          className={[
            "inline-flex items-center gap-1 rounded-md border border-border/40 bg-card/50 font-medium text-muted-foreground transition-colors hover:border-primary/30 hover:text-foreground",
            compact ? "px-1.5 py-0.5" : "px-2 py-1",
          ].join(" ")}
        >
          {link.label}
          <ExternalLink size={compact ? 10 : 11} />
        </a>
      ))}
    </div>
  );
}
