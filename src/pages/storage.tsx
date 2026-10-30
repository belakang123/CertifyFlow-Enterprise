import Head from 'next/head';
import { useState, useEffect, useRef } from 'react';
import { db } from '@/db';
import type { Template, BatchHistoryEntry } from '@/types/certificate';
import { formatTimestamp, formatDuration } from '@/lib/utils';
import Link from 'next/link';
import {
  FolderIcon,
  SparklesIcon,
  ImageIcon,
  BarChartIcon,
  HardDriveIcon,
  HourglassIcon,
  TrashIcon,
  AwardIcon,
  CheckCircleIcon,
  CompassIcon,
} from '@/components/Icons';

// Komponen thumbnail yang mengelola lifecycle URL-nya sendiri
function TplThumb({ blob, name }: { blob: Blob; name: string }) {
  const [src, setSrc] = useState('');
  useEffect(() => {
    const url = URL.createObjectURL(blob);
    setSrc(url);
    return () => URL.revokeObjectURL(url);
  }, [blob]);
  return src ? (
    <img src={src} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
  ) : (
    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <ImageIcon size={28} color="var(--text-3)" />
    </div>
  );
}

export default function StoragePage() {
  const [templates, setTemplates]   = useState<Template[]>([]);
  const [history, setHistory]       = useState<BatchHistoryEntry[]>([]);
  const [tab, setTab]               = useState<'templates' | 'history'>('templates');
  const [loading, setLoading]       = useState(true);
  const [toast, setToast]           = useState('');
  const toastTimer                  = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), 3000);
  };

  const load = async () => {
    setLoading(true);
    try {
      const [tmpl, hist] = await Promise.all([
        db.templates.orderBy('createdAt').reverse().toArray(),
        db.batchHistory.orderBy('completedAt').reverse().toArray(),
      ]);
      setTemplates(tmpl); setHistory(hist);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const deleteTpl = async (id: string) => {
    if (!confirm('Hapus template ini? Aksi ini tidak bisa dibatalkan.')) return;
    await db.templates.delete(id);
    await db.layoutConfigs.where('templateId').equals(id).delete();
    showToast('Template berhasil dihapus');
    load();
  };

  const deleteHistory = async (id: string) => {
    await db.batchHistory.delete(id);
    setHistory(p => p.filter(h => h.id !== id));
    showToast('Riwayat dihapus');
  };

  const clearAllHistory = async () => {
    if (!confirm(`Hapus semua ${history.length} riwayat batch?`)) return;
    await db.batchHistory.clear();
    setHistory([]);
    showToast('Semua riwayat dihapus');
  };

  const totalBytes = templates.reduce((a, t) => a + t.fileBlob.size, 0);
  const fmtBytes = (b: number) => b > 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(1)} MB` : `${Math.round(b / 1024)} KB`;

  return (
    <>
      <Head>
        <title>Library — CertifyFlow Enterprise</title>
        <meta name="description" content="Kelola template dan riwayat pembuatan sertifikat." />
        <meta name="robots" content="noindex, nofollow" />
      </Head>

      {/* Toast notification */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 999,
          background: 'var(--surface)', border: '1px solid var(--green)',
          borderRadius: 'var(--r-lg)', padding: '12px 20px',
          fontSize: 14, fontWeight: 600, color: 'var(--green)',
          boxShadow: 'var(--shadow-lg)', animation: 'fa 0.2s',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <CheckCircleIcon size={18} color="var(--green)" />
          <span>{toast}</span>
        </div>
      )}

      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '32px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 900, letterSpacing: '-0.03em', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 10 }}>
              <FolderIcon size={26} color="var(--primary)" />
              Library
            </h1>
            <p style={{ color: 'var(--text-2)', fontSize: 14 }}>Template tersimpan dan riwayat pembuatan sertifikat</p>
          </div>
          <Link href="/wizard" className="btn btn-primary" id="new-batch-btn" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <SparklesIcon size={16} />
            Buat Sertifikat Baru
          </Link>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 24 }}>
          {[
            { icon: <ImageIcon size={22} color="var(--primary)" />, l: 'Template Tersimpan', v: String(templates.length), c: 'var(--primary)' },
            { icon: <BarChartIcon size={22} color="var(--green)" />, l: 'Riwayat Batch', v: String(history.length), c: 'var(--green)' },
            { icon: <HardDriveIcon size={22} color="var(--amber)" />, l: 'Storage Digunakan', v: fmtBytes(totalBytes), c: 'var(--amber)' },
          ].map(s => (
            <div className="card" key={s.l}>
              <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 42, height: 42, borderRadius: 'var(--r-md)', background: `${s.c}20`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {s.icon}
                </div>
                <div>
                  <div style={{ fontSize: 22, fontWeight: 800, lineHeight: 1 }}>{loading ? '…' : s.v}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 3 }}>{s.l}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="tabs" style={{ marginBottom: 20 }}>
          {[
            { k: 'templates', l: 'Template', icon: <ImageIcon size={15} style={{ marginRight: 6 }} /> },
            { k: 'history', l: 'Riwayat Batch', icon: <BarChartIcon size={15} style={{ marginRight: 6 }} /> },
          ].map(t => (
            <button key={t.k} className={`tab ${tab === t.k ? 'active' : ''}`} id={`tab-${t.k}-btn`}
              onClick={() => setTab(t.k as typeof tab)}
              style={{ display: 'inline-flex', alignItems: 'center' }}>
              {t.icon}
              {t.l}
            </button>
          ))}
        </div>

        {/* ── TEMPLATES TAB ── */}
        {tab === 'templates' && (
          loading ? (
            <div style={{ textAlign: 'center', padding: 64, color: 'var(--text-3)' }}>
              <div className="pulse" style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
                <HourglassIcon size={36} color="var(--primary)" />
              </div>
              <div style={{ fontSize: 13 }}>Memuat library...</div>
            </div>
          ) : templates.length === 0 ? (
            <div className="card">
              <div style={{ padding: '64px', textAlign: 'center' }}>
                <div style={{ display: 'flex', justifyContent: 'center', opacity: 0.35, marginBottom: 16 }}>
                  <ImageIcon size={60} color="var(--text-3)" />
                </div>
                <div style={{ fontSize: 17, fontWeight: 800, marginBottom: 8 }}>Belum ada template tersimpan</div>
                <div style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 24, maxWidth: 400, margin: '0 auto 24px' }}>
                  Template akan tersimpan otomatis ke IndexedDB browser saat Anda upload gambar di wizard.
                </div>
                <Link href="/wizard" className="btn btn-primary btn-lg" id="go-wizard-empty-btn" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                  <SparklesIcon size={18} />
                  Upload Template Pertama
                </Link>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {templates.map(t => (
                <div className="card" key={t.id}>
                  <div style={{ padding: 20, display: 'grid', gridTemplateColumns: '130px 1fr auto', gap: 20, alignItems: 'center' }}>
                    {/* Thumbnail */}
                    <div style={{
                      width: 130, height: 90, borderRadius: 'var(--r-md)',
                      overflow: 'hidden', border: '1px solid var(--border)',
                      background: 'var(--elevated)', flexShrink: 0,
                    }}>
                      <TplThumb blob={t.fileBlob} name={t.name} />
                    </div>

                    {/* Info */}
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 8, color: 'var(--text)' }}>{t.name}</div>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                        <span className="badge badge-blue">{t.fileType.split('/')[1]?.toUpperCase()}</span>
                        <span className="badge badge-amber">{t.dimensions.width}×{t.dimensions.height}px</span>
                        <span className="badge badge-green">{fmtBytes(t.fileBlob.size)}</span>
                        <span className="badge" style={{ background: 'var(--elevated)', color: 'var(--text-3)', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                          <CompassIcon size={12} />
                          {t.dimensions.orientation === 'landscape' ? 'Landscape' : 'Portrait'}
                        </span>
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-3)' }}>
                        Disimpan: {formatTimestamp(t.createdAt)}
                      </div>
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0 }}>
                      <Link href={`/wizard?templateId=${t.id}`} className="btn btn-primary btn-sm" id={`use-${t.id}-btn`} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        <SparklesIcon size={14} />
                        Pakai Template
                      </Link>
                      <button id={`del-${t.id}-btn`} className="btn btn-red btn-sm"
                        onClick={() => deleteTpl(t.id)}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        <TrashIcon size={14} />
                        Hapus
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        )}

        {/* ── HISTORY TAB ── */}
        {tab === 'history' && (
          history.length === 0 ? (
            <div className="card">
              <div style={{ padding: 64, textAlign: 'center' }}>
                <div style={{ display: 'flex', justifyContent: 'center', opacity: 0.35, marginBottom: 16 }}>
                  <BarChartIcon size={60} color="var(--text-3)" />
                </div>
                <div style={{ fontSize: 17, fontWeight: 800, marginBottom: 8 }}>Belum ada riwayat</div>
                <div style={{ fontSize: 13, color: 'var(--text-2)' }}>
                  Riwayat muncul otomatis setelah Anda menjalankan proses generate sertifikat
                </div>
              </div>
            </div>
          ) : (
            <div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
                <button className="btn btn-red btn-sm" id="clear-history-btn" onClick={clearAllHistory} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <TrashIcon size={14} />
                  Hapus Semua Riwayat
                </button>
              </div>
              <div className="card" style={{ overflow: 'hidden' }}>
                <table className="dtable" id="history-table">
                  <thead>
                    <tr>
                      <th>Tanggal</th>
                      <th>Template</th>
                      <th>Total Dibuat</th>
                      <th>Format</th>
                      <th>Durasi</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map(h => (
                      <tr key={h.id}>
                        <td>{formatTimestamp(h.completedAt)}</td>
                        <td style={{ fontWeight: 600 }}>{h.templateName}</td>
                        <td>
                          <span className="badge badge-green" style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                            <AwardIcon size={13} color="var(--green)" />
                            {h.totalGenerated.toLocaleString()} sertifikat
                          </span>
                        </td>
                        <td><span className="badge badge-blue">{h.exportFormat}</span></td>
                        <td>{formatDuration(h.executionTimeMs)}</td>
                        <td>
                          <button className="btn btn-ghost btn-sm" style={{ color: 'var(--red)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            id={`del-hist-${h.id}-btn`}
                            title="Hapus riwayat"
                            onClick={() => deleteHistory(h.id)}>
                            <TrashIcon size={14} color="var(--red)" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )
        )}
      </div>
    </>
  );
}
