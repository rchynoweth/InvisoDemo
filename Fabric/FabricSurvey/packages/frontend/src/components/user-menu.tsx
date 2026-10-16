import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Settings, UserRound } from 'lucide-react';

import { cn } from '@/lib/utils';

/**
 * The signed-in name in the top bar. Admins get a dropdown with Settings;
 * everyone else just sees their name.
 */
export function UserMenu({
  email,
  isAdmin,
  onOpenSettings,
  settingsActive,
}: {
  email: string;
  isAdmin: boolean;
  onOpenSettings: () => void;
  settingsActive: boolean;
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const firstItem = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    firstItem.current?.focus();
    const onPointer = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (!isAdmin) {
    return <span className="hidden text-200 text-inviso-navy/70 sm:inline">{email}</span>;
  }

  return (
    <div ref={root} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Account menu for ${email}`}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'flex items-center gap-100 rounded-lg px-200 py-200 text-[length:var(--text-200)] text-inviso-navy transition hover:bg-inviso-tint-50 hover:text-inviso-blue focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inviso-bright',
          (open || settingsActive) && 'bg-inviso-tint-50 text-inviso-blue'
        )}
      >
        <UserRound className="icon-size-200 sm:hidden" aria-hidden="true" />
        <span className="hidden sm:inline">{email}</span>
        <ChevronDown className={cn('icon-size-200 transition', open && 'rotate-180')} aria-hidden="true" />
      </button>
      {open ? (
        <div
          role="menu"
          aria-label="Account"
          className="absolute right-0 z-10 mt-100 min-w-[200px] rounded-xl border border-inviso-tint-100 bg-white p-100 text-inviso-navy shadow-lg"
        >
          <button
            ref={firstItem}
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onOpenSettings();
            }}
            className="flex w-full items-center gap-200 rounded-lg px-300 py-200 text-left text-[length:var(--text-300)] font-semibold transition hover:bg-inviso-tint-50 hover:text-inviso-blue focus-visible:bg-inviso-tint-50 focus-visible:outline-none"
          >
            <Settings className="icon-size-200" aria-hidden="true" />
            Settings
          </button>
        </div>
      ) : null}
    </div>
  );
}
