import { vi } from '@/i18n/vi';
import { useLearner } from '@/storage/useLearner';

/** Notice above the page when the browser blocks storage. */
export function Banners() {
  const available = useLearner((s) => s.storageAvailable);
  const t = vi.banners;
  if (available) return null;
  return (
    <div className="flex flex-col gap-2 px-4 pt-4 md:px-8">
      <p role="alert" className="rounded-2xl border-2 border-warning-fg/25 bg-warning-bg/60 px-4 py-3 text-sm font-bold text-warning-fg">
        <span aria-hidden="true">⚠ </span>{t.storageBlocked}
      </p>
    </div>
  );
}
