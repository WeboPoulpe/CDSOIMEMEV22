export function mergeTemplate(body: string, ctx: Record<string, string>): string {
  // 1. Sections conditionnelles {{#key}}...{{/key}}
  let out = body.replace(
    /\{\{#(\w+)\}\}([\s\S]*?)\{\{\/\1\}\}/g,
    (_m, key: string, inner: string) => {
      const v = ctx[key];
      return v && v.trim() !== "" ? inner : "";
    }
  );
  // 2. Champs simples {{key}}
  out = out.replace(/\{\{(\w+)\}\}/g, (_m, key: string) => ctx[key] ?? "");
  return out;
}
