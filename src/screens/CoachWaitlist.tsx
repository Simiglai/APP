import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { locale, t } from '../i18n';
import { Card } from '../ui';
import { WAITLIST_PATH } from './Waitlist';

type Row = { id: string; email: string; name: string; language: string; source: string | null; created_at: string; unsubscribed_at: string | null };

/** Coach: the pre-launch waitlist / mailing list. */
export default function CoachWaitlist() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [copied, setCopied] = useState('');

  const load = useCallback(async () => {
    const { data } = await supabase.from('waitlist').select('*').order('created_at', { ascending: false });
    setRows(data ?? []);
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const active = (rows ?? []).filter((r) => !r.unsubscribed_at);
  const bySource = active.reduce<Record<string, number>>((acc, r) => ({ ...acc, [r.source ?? t('direct')]: (acc[r.source ?? t('direct')] ?? 0) + 1 }), {});
  const shareUrl = (ref: string) => `${location.origin}${WAITLIST_PATH}?ref=${ref}`;

  const copy = async (text: string, label: string) => {
    await navigator.clipboard?.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(''), 2500);
  };

  const downloadCsv = () => {
    const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
    const csv = ['name,email,language,source,joined', ...active.map((r) => [r.name, r.email, r.language, r.source ?? '', r.created_at.slice(0, 10)].map(esc).join(','))].join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    a.download = `venteliste-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  const unsubscribe = async (r: Row) => {
    if (!confirm(t('Remove {email} from the mailing list?', { email: r.email }))) return;
    await supabase.from('waitlist').update({ unsubscribed_at: new Date().toISOString() }).eq('id', r.id);
    load();
  };

  return (
    <>
      <Card title={t('Share your waitlist')} hint={t('Each link shows where sign-ups came from.')}>
        {(['instagram', 'bio', 'story', 'friend'] as const).map((ref) => (
          <div key={ref} className="share-row">
            <code>{shareUrl(ref).replace(/^https?:\/\//, '')}</code>
            <button className="btn btn--link" onClick={() => copy(shareUrl(ref), ref)}>{copied === ref ? t('Copied ✓') : t('Copy')}</button>
          </div>
        ))}
      </Card>

      <div className="hero__stats">
        <div><strong>{active.length}</strong><span>{t('on the list')}</span></div>
        {Object.entries(bySource)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 2)
          .map(([src, n]) => (
            <div key={src}><strong>{n}</strong><span>{t('from {source}', { source: src })}</span></div>
          ))}
      </div>

      <Card title={t('Waitlist')} hint={t('Everyone here gets 1 week free when they sign up in the app with the same email.')}>
        <div className="row">
          <button className="btn" disabled={!active.length} onClick={downloadCsv}>{t('Download list (CSV)')}</button>
          <button className="btn btn--ghost" disabled={!active.length} onClick={() => copy(active.map((r) => r.email).join(', '), 'all')}>
            {copied === 'all' ? t('Copied ✓') : t('Copy all emails')}
          </button>
        </div>
        {rows === null ? (
          <div className="spinner" />
        ) : rows.length === 0 ? (
          <p className="empty">{t('No sign-ups yet. Share your link to get started.')}</p>
        ) : (
          <div className="list">
            {rows.map((r) => (
              <div key={r.id} className="list__item">
                <span>
                  <strong>{r.name || '—'} {r.unsubscribed_at && <span className="tag tag--mirror">{t('Unsubscribed')}</span>}</strong>
                  <small className="muted">
                    {r.email} · {new Date(r.created_at).toLocaleDateString(locale(), { day: 'numeric', month: 'short' })}
                    {r.source ? ` · ${r.source}` : ''} · {r.language.toUpperCase()}
                  </small>
                </span>
                {!r.unsubscribed_at && (
                  <button className="btn btn--link muted small" onClick={() => unsubscribe(r)}>{t('Unsubscribe')}</button>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </>
  );
}
