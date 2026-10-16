/**
 * Shared Tailwind class strings, so buttons, inputs and cards look the same
 * everywhere. Sizes use the `text-[length:…]` form because `cn()` would
 * otherwise drop a size class that sits next to a text colour class.
 */
const focus = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

export const ui = {
  card: 'rounded-2xl border border-border bg-card p-500 shadow-sm sm:p-600',
  input: `w-full rounded-lg border border-input bg-card px-300 py-200 text-[length:var(--text-300)] text-foreground placeholder:text-muted-foreground focus-visible:border-primary ${focus}`,
  chip: 'rounded-full bg-accent px-200 py-100 text-[length:var(--text-100)] font-semibold text-accent-foreground',
  button: {
    primary: `flex shrink-0 items-center justify-center gap-200 whitespace-nowrap rounded-lg bg-primary px-500 py-300 text-[length:var(--text-300)] font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 ${focus}`,
    secondary: `flex shrink-0 items-center justify-center gap-200 whitespace-nowrap rounded-lg border border-input bg-card px-400 py-200 text-[length:var(--text-300)] font-semibold text-foreground transition hover:border-primary hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50 ${focus}`,
    quiet: `flex shrink-0 items-center gap-100 whitespace-nowrap rounded-lg px-300 py-200 text-[length:var(--text-200)] font-semibold text-primary transition hover:bg-accent disabled:opacity-50 ${focus}`,
  },
} as const;
