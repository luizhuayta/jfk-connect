/** Sombra de papel del panel padre (DESIGN.md: card lift). */
export const paperShadow =
  "shadow-[0_1px_2px_rgba(17,28,44,0.04),0_8px_24px_-16px_rgba(17,28,44,0.12)]";

export const paperCardClass =
  `rounded-2xl border border-outline-variant bg-surface-container-lowest ${paperShadow}`;

/** CTA oro: se eleva; no envuelve un Button dentro de un Link. */
export const honorLinkClass =
  "inline-flex h-11 min-h-11 items-center justify-center gap-1.5 rounded-lg bg-accent px-4 text-sm font-semibold text-primary transition-transform duration-150 hover:bg-accent-hover hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent motion-reduce:transform-none";

export const quietLinkClass =
  "inline-flex h-11 min-h-11 items-center justify-center gap-1.5 rounded-lg border border-primary/20 px-4 text-sm font-semibold text-primary transition-colors hover:bg-primary hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent";
