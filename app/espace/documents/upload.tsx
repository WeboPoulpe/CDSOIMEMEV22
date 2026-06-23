"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { uploadClientDocumentAction } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ClientDocumentUpload() {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();

  return (
    <form
      ref={formRef}
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        setError(null);
        start(async () => {
          const res = await uploadClientDocumentAction(fd);
          if (res?.error) setError(res.error);
          else { formRef.current?.reset(); setFileName(""); router.refresh(); }
        });
      }}
      className="space-y-3"
    >
      <input
        type="file"
        name="file"
        required
        onChange={(e) => setFileName(e.target.files?.[0]?.name ?? "")}
        className="block w-full text-sm text-foreground/70 file:mr-3 file:rounded-full file:border-0 file:bg-primary/10 file:px-4 file:py-2 file:text-sm file:font-medium file:text-primary hover:file:bg-primary/15"
      />
      <Input name="titre" placeholder={fileName || "Titre (optionnel)"} />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button type="submit" disabled={pending}>{pending ? "Envoi…" : "Déposer le document"}</Button>
    </form>
  );
}
