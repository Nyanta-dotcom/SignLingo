import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { vi } from '@/i18n/vi';
import { downloadBackup } from '@/lib/downloadBackup';
import { useLearner } from '@/storage/useLearner';
import type { Settings as SettingsData } from '@/storage/types';

const GOALS: SettingsData['daily_xp_goal'][] = [10, 20, 30, 50];

function readText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error);
    r.readAsText(file);
  });
}

/** Settings (docs/05 §5.7): appearance, daily goal, display name, camera and the learner's data. */
export function Settings() {
  const settings = useLearner((s) => s.settings);
  const name = useLearner((s) => s.profile.display_name ?? '');
  const available = useLearner((s) => s.storageAvailable);
  const backup = useLearner((s) => s.backup);
  const update = useLearner((s) => s.updateSettings);
  const setName = useLearner((s) => s.setDisplayName);
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [pending, setPending] = useState<{ kind: 'import'; raw: unknown } | { kind: 'clear' } | null>(null);
  const [notice, setNotice] = useState<{ text: string; bad: boolean } | null>(null);
  const picker = useRef<HTMLInputElement>(null);
  const t = vi.settings;

  useEffect(() => {
    let live = true;
    navigator.mediaDevices?.enumerateDevices?.()
      .then((all) => live && setCameras(all.filter((d) => d.kind === 'videoinput')))
      .catch(() => {});
    return () => { live = false; };
  }, []);

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    try {
      setPending({ kind: 'import', raw: JSON.parse(await readText(file)) });
      setNotice(null);
    } catch {
      setPending(null);
      setNotice({ text: t.importBad, bad: true });
    }
    if (picker.current) picker.current.value = '';
  };

  const confirm = () => {
    if (!pending) return;
    try {
      if (pending.kind === 'import') backup.importBackup(pending.raw);
      else backup.clearAll();
      setNotice({ text: pending.kind === 'import' ? t.importOk : t.clearOk, bad: false });
    } catch {
      setNotice({ text: t.importBad, bad: true });
    }
    setPending(null);
  };

  return (
    <section className="mx-auto flex max-w-2xl flex-col gap-4">
      <h1 className="text-3xl font-extrabold">{t.title}</h1>

      <Card className="flex flex-col gap-3">
        <h2 className="font-extrabold">{t.appearance}</h2>
        <ThemeToggle value={settings.theme} onChange={(theme) => update({ theme })} />
      </Card>

      <Card className="flex flex-col gap-3">
        <h2 className="font-extrabold">{t.sound}</h2>
        <label className="flex min-h-11 items-center gap-3 font-bold">
          <input type="checkbox" className="size-5" checked={settings.sound_on} onChange={(e) => update({ sound_on: e.target.checked })} />
          {t.soundOn}
        </label>
      </Card>

      <Card className="flex flex-col gap-3">
        <h2 className="font-extrabold">{t.goal}</h2>
        <div role="radiogroup" aria-label={t.goal} className="flex flex-wrap gap-2">
          {GOALS.map((g) => (
            <label key={g} className="flex min-h-11 cursor-pointer items-center rounded-full border-2 border-border px-4 font-bold has-[:checked]:border-brand-500 has-[:checked]:bg-brand-600 has-[:checked]:text-text-on-brand has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-focus-ring">
              <input type="radio" name="goal" className="sr-only" checked={settings.daily_xp_goal === g} onChange={() => update({ daily_xp_goal: g })} />
              {t.goalOption(g)}
            </label>
          ))}
        </div>
      </Card>

      <Card className="flex flex-col gap-2">
        <label htmlFor="display-name" className="font-extrabold">{t.name}</label>
        <input
          id="display-name" key={name} defaultValue={name} maxLength={30} autoComplete="off" aria-describedby="name-help"
          onBlur={(e) => setName(e.target.value)}
          className="min-h-12 rounded-[var(--radius-xl)] border-2 border-border bg-surface px-4 text-lg font-bold"
        />
        <p id="name-help" className="text-sm text-text-muted">{t.nameHelp}</p>
      </Card>

      <Card className="flex flex-col gap-2">
        <label htmlFor="camera" className="font-extrabold">{t.camera}</label>
        <select
          id="camera" value={settings.camera_device_id ?? ''} aria-describedby="camera-help"
          onChange={(e) => update({ camera_device_id: e.target.value || undefined })}
          className="min-h-12 rounded-[var(--radius-xl)] border-2 border-border bg-surface px-3"
        >
          <option value="">{t.cameraAuto}</option>
          {cameras.map((c, i) => <option key={c.deviceId || i} value={c.deviceId}>{c.label || t.cameraN(i + 1)}</option>)}
        </select>
        <p id="camera-help" className="text-sm text-text-muted">{t.cameraHelp}</p>
      </Card>

      <Card className="flex flex-col gap-3">
        <h2 className="font-extrabold">{t.data}</h2>
        <p className="text-text-muted">{t.dataNote}</p>
        {!available && <p role="alert" className="font-bold text-warning-fg">{t.storageBlocked}</p>}
        <div className="flex flex-wrap gap-3">
          <Button variant="secondary" onClick={() => downloadBackup(backup.exportBackup())}>{t.export}</Button>
          <Button variant="secondary" onClick={() => picker.current?.click()}>{t.import}</Button>
          <input ref={picker} type="file" accept="application/json,.json" className="sr-only" tabIndex={-1} aria-label={t.import} onChange={(e) => void onFile(e.target.files?.[0])} />
          <Button variant="danger" onClick={() => { setNotice(null); setPending({ kind: 'clear' }); }}>{t.clear}</Button>
        </div>
        {pending && (
          <div role="alertdialog" aria-label={pending.kind === 'import' ? t.import : t.clear} className="flex flex-col gap-3 rounded-[var(--radius-xl)] border-2 border-danger-fg p-4">
            <p className="font-bold">{pending.kind === 'import' ? t.importConfirm : t.clearConfirm}</p>
            <div className="flex gap-3">
              <Button variant="danger" onClick={confirm}>{pending.kind === 'import' ? t.importYes : t.clearYes}</Button>
              <Button variant="secondary" onClick={() => setPending(null)}>{t.cancel}</Button>
            </div>
          </div>
        )}
        {notice && <p role="status" className={`font-bold ${notice.bad ? 'text-danger-on-bg' : 'text-success-fg'}`}>{notice.text}</p>}
      </Card>
    </section>
  );
}
