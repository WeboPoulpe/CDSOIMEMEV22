"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { addTodoAction, toggleTodoAction, deleteTodoAction } from "./todo-actions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type Todo = { id: string; titre: string; statut: string; echeance: string | null };

export function TodoList({ todos }: { todos: Todo[] }) {
  const [titre, setTitre] = useState("");
  const [pending, start] = useTransition();
  const router = useRouter();
  const run = (fn: () => Promise<unknown>) => start(async () => { await fn(); router.refresh(); });

  return (
    <div className="space-y-3">
      <form
        onSubmit={(e) => { e.preventDefault(); if (!titre.trim()) return; run(async () => { await addTodoAction(titre); setTitre(""); }); }}
        className="flex gap-2"
      >
        <Input value={titre} onChange={(e) => setTitre(e.target.value)} placeholder="Ajouter une tâche…" className="h-9" />
        <Button type="submit" size="sm" disabled={pending || !titre.trim()}><Plus className="h-4 w-4" /></Button>
      </form>

      <div className="space-y-1.5">
        {todos.length === 0 && <p className="py-1 text-sm text-foreground/45">Aucune tâche. Prends soin de toi 🌸</p>}
        {todos.map((t) => {
          const done = t.statut === "fait";
          return (
            <div key={t.id} className="flex items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-muted/40">
              <input
                type="checkbox"
                checked={done}
                disabled={pending}
                onChange={(e) => run(() => toggleTodoAction(t.id, e.target.checked))}
                className="h-4 w-4 shrink-0"
              />
              <span className={`flex-1 text-sm ${done ? "text-foreground/40 line-through" : "text-foreground"}`}>
                {t.titre}
                {t.echeance && <span className="ml-2 text-xs text-foreground/45">· {t.echeance}</span>}
              </span>
              <button type="button" disabled={pending} onClick={() => run(() => deleteTodoAction(t.id))} aria-label="Supprimer" className="text-foreground/30 hover:text-red-600">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
