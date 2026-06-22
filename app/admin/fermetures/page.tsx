import { prisma } from "@/lib/db";
import { ClosedForm, DeleteClosedButton } from "./closed-form";
import { formatDateRange } from "@/lib/utils";

export default async function FermeturesPage() {
  const periods = await prisma.closedPeriod.findMany({ orderBy: { startAt: "asc" } });
  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl">Périodes de fermeture</h1>
      <ClosedForm />
      <ul className="space-y-2">
        {periods.map((p) => (
          <li key={p.id} className="flex items-center justify-between rounded-lg bg-muted px-3 py-2 text-sm">
            <span>
              {formatDateRange(p.startAt, p.endAt)}
              {p.reason ? ` — ${p.reason}` : ""}
            </span>
            <DeleteClosedButton id={p.id} />
          </li>
        ))}
        {periods.length === 0 && <li className="text-foreground/50">Aucune fermeture programmée.</li>}
      </ul>
    </div>
  );
}
