import type { LucideIcon } from "lucide-react";

/** Page header: serif title + subtitle + optional action, closed by a gold hairline. */
export function PageHeader({
  title, subtitle, action,
}: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <header className="mb-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl text-foreground sm:text-4xl">{title}</h1>
          {subtitle && <p className="mt-1.5 text-foreground/55">{subtitle}</p>}
        </div>
        {action}
      </div>
      <div className="hairline-gold mt-5 h-px w-full opacity-40" />
    </header>
  );
}

const TONES: Record<string, string> = {
  rose: "bg-primary/12 text-primary",
  mauve: "bg-secondary/15 text-secondary",
  gold: "bg-[#C9A24B]/15 text-[#A8842F]",
  sage: "bg-[#7C8B6B]/15 text-[#5d6a4f]",
};

/** A single metric, with an icon chip and a serif figure. */
export function StatCard({
  icon: Icon, label, value, tone = "rose", href,
}: { icon: LucideIcon; label: string; value: React.ReactNode; tone?: keyof typeof TONES | string; href?: string }) {
  const inner = (
    <div className="rounded-2xl border border-primary/10 bg-card/70 p-5 backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:border-primary/25">
      <div className="flex items-center justify-between">
        <span className="text-sm text-foreground/55">{label}</span>
        <span className={`grid h-9 w-9 place-items-center rounded-full ${TONES[tone] ?? TONES.rose}`}>
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <p className="mt-3 font-serif text-3xl text-foreground">{value}</p>
    </div>
  );
  return href ? <a href={href} className="block">{inner}</a> : inner;
}

/** A titled soft surface to group content. */
export function SectionCard({
  title, action, children, className = "",
}: { title?: string; action?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-2xl border border-primary/10 bg-card/70 p-6 backdrop-blur-sm ${className}`}>
      {(title || action) && (
        <div className="mb-4 flex items-center justify-between">
          {title && <h2 className="font-serif text-lg text-foreground">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function EmptyState({ children }: { children: React.ReactNode }) {
  return <p className="py-2 text-sm text-foreground/45">{children}</p>;
}
