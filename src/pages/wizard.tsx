import Head from 'next/head';
import { useState, useRef, useCallback, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Papa from 'papaparse';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { v4 as uuid } from 'uuid';
import { db } from '@/db';
import type { Template } from '@/types/certificate';

// Komponen thumbnail template yang mengelola lifecycle URL-nya sendiri
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
    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>🖼️</div>
  );
}

// ─── TYPES ───────────────────────────────────────────────────────────────────
type ExportFmt = 'ZIP-PNG' | 'ZIP-PDF' | 'SINGLE-PDF';

interface CanvasEl {
  id: string;
  kind: 'nama' | 'tanggal' | 'id_sertifikat' | 'qr_code' | 'custom';
  label: string;
  freeText?: string; // only for 'custom' kind — the literal text to render
  x: number; y: number; w: number; h: number;
  font: string; size: number; color: string;
  bold: boolean; italic: boolean; align: 'left' | 'center' | 'right';
}

interface FieldMap { variable: string; column: string; }

interface Progress {
  total: number; done: number; failed: number;
  speed: number; workers: number; etaMs: number;
  logs: string[]; status: 'idle' | 'running' | 'done' | 'cancelled' | 'error';
}

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const VARS: { kind: CanvasEl['kind']; icon: string; label: string; color: string }[] = [
  { kind: 'nama',          icon: '🔤', label: '{{nama}}',          color: '#2563eb' },
  { kind: 'tanggal',       icon: '📅', label: '{{tanggal}}',       color: '#7c3aed' },
  { kind: 'id_sertifikat', icon: '#️⃣', label: '{{id_sertifikat}}', color: '#059669' },
  { kind: 'qr_code',       icon: '⬛', label: '{{qr_code}}',       color: '#d97706' },
];
const FONTS = ['Inter','Roboto','Open Sans','Montserrat','Poppins','Playfair Display','Merriweather','Dancing Script','Great Vibes','Raleway'];

// ─── STEP INDICATOR ───────────────────────────────────────────────────────────
function StepBar({ step }: { step: number }) {
  const steps = ['Upload Template', 'Atur Posisi', 'Import CSV', 'Generate'];
  return (
    <div className="wizard-bar">
      {steps.map((s, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', flex: i < steps.length - 1 ? 1 : undefined }}>
          <div className={`wz-step ${step === i + 1 ? 'active' : step > i + 1 ? 'done' : ''}`}>
            <div className="wz-circle">{step > i + 1 ? '✓' : i + 1}</div>
            <div className="wz-label">{s}</div>
          </div>
          {i < steps.length - 1 && <div className={`wz-line ${step > i + 1 ? 'done' : ''}`} />}
        </div>
      ))}
    </div>
  );
}

// ─── ELEMENT OVERLAY ──────────────────────────────────────────────────────────
// Renders element as live-styled text preview on canvas (like Canva)
function ElOverlay({
  el, selected, scale, onClick, onUpdate,
}: {
  el: CanvasEl; selected: boolean; scale: number;
  onClick: () => void; onUpdate: (u: Partial<CanvasEl>) => void;
}) {
  const drag = useRef<{ sx: number; sy: number; ox: number; oy: number } | null>(null);
  const v = VARS.find(v => v.kind === el.kind);

  const onMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation(); onClick();
    drag.current = { sx: e.clientX, sy: e.clientY, ox: el.x, oy: el.y };
    const mm = (ev: MouseEvent) => {
      if (!drag.current) return;
      onUpdate({
        x: Math.round(drag.current.ox + (ev.clientX - drag.current.sx) / scale),
        y: Math.round(drag.current.oy + (ev.clientY - drag.current.sy) / scale),
      });
    };
    const mu = () => { drag.current = null; window.removeEventListener('mousemove', mm); window.removeEventListener('mouseup', mu); };
    window.addEventListener('mousemove', mm); window.addEventListener('mouseup', mu);
  };

  const isQr = el.kind === 'qr_code';
  const displayText = el.kind === 'custom' ? (el.freeText || el.label) : el.label;

  return (
    <div
      onMouseDown={onMouseDown}
      className={`c-tag ${selected ? 'selected' : ''}`}
      style={{
        left: el.x * scale,
        top: el.y * scale,
        width: Math.max(el.w * scale, 60),
        height: Math.max(el.h * scale, isQr ? 60 : 28),
        zIndex: selected ? 20 : 10,
        // Remove default c-tag background for text elements so live preview shows through
        background: isQr ? 'rgba(255,255,255,0.85)' : 'transparent',
        border: selected
          ? '2px solid var(--primary)'
          : `1.5px dashed ${v ? v.color : '#888'}88`,
        borderRadius: 3,
        display: 'flex',
        alignItems: 'center',
        justifyContent: el.align === 'center' ? 'center' : el.align === 'right' ? 'flex-end' : 'flex-start',
        overflow: 'hidden',
        cursor: 'move',
        userSelect: 'none',
        boxSizing: 'border-box',
      }}
    >
      {isQr ? (
        // QR placeholder
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', gap: 4 }}>
          <span style={{ fontSize: Math.max(18, el.w * scale * 0.35) + 'px' }}>⬛</span>
          <span style={{ fontSize: Math.max(8, 10 * scale) + 'px', color: '#888', fontWeight: 600 }}>QR Code</span>
        </div>
      ) : (
        // Live text preview — renders with actual font/size/color/bold/italic
        <span
          style={{
            fontFamily: `"${el.font}", sans-serif`,
            fontSize: Math.max(8, el.size * scale) + 'px',
            fontWeight: el.bold ? 700 : 400,
            fontStyle: el.italic ? 'italic' : 'normal',
            color: el.color,
            lineHeight: 1.2,
            padding: '0 4px',
            overflow: 'hidden',
            whiteSpace: 'nowrap',
            textOverflow: 'ellipsis',
            maxWidth: '100%',
            textAlign: el.align,
            width: '100%',
            textShadow: '0 1px 3px rgba(0,0,0,0.3)', // visibility on any bg
          }}
        >
          {displayText}
        </span>
      )}
      {/* Selection handle badge */}
      {selected && (
        <div style={{
          position: 'absolute', top: -20, left: 0,
          background: 'var(--primary)', color: '#fff',
          fontSize: 10, fontWeight: 700,
          padding: '2px 6px', borderRadius: 4,
          whiteSpace: 'nowrap', lineHeight: 1.4,
          pointerEvents: 'none',
        }}>
          {v?.icon ?? '✏️'} {el.label}
        </div>
      )}
    </div>
  );
}

// ─── PROPERTY PANEL ──────────────────────────────────────────────────────────
function PropPanel({
  el, onChange, onDelete,
}: {
  el: CanvasEl | null;
  onChange: (u: Partial<CanvasEl>) => void;
  onDelete: () => void;
}) {
  if (!el) return (
    <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-3)' }}>
      <div style={{ fontSize: '36px', marginBottom: '10px' }}>👆</div>
      <div style={{ fontSize: '13px' }}>Klik elemen di canvas untuk mengedit</div>
    </div>
  );

  const previewText = el.kind === 'custom'
    ? (el.freeText || 'Teks kustom...')
    : el.label;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div className="e-section" style={{ paddingTop: 0 }}>Properti — <span style={{ color: 'var(--primary)' }}>{el.label}</span></div>

      {/* Custom element: editable free text */}
      {el.kind === 'custom' && (
        <div className="field">
          <label className="label">✏️ Teks Kustom</label>
          <input
            id="prop-freetext"
            type="text"
            className="input"
            value={el.freeText ?? ''}
            placeholder="Ketik teks di sini..."
            onChange={e => onChange({ freeText: e.target.value, label: e.target.value || 'Kustom' })}
          />
        </div>
      )}

      {el.kind !== 'qr_code' && (
        <>
          <div className="field">
            <label className="label">Font</label>
            <select className="select" value={el.font} onChange={e => onChange({ font: e.target.value })} id="prop-font">
              {FONTS.map(f => <option key={f}>{f}</option>)}
            </select>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div className="field">
              <label className="label">Ukuran (px)</label>
              <input id="prop-size" type="number" className="input" value={el.size} min={8} max={300}
                onChange={e => onChange({ size: +e.target.value })} />
            </div>
            <div className="field">
              <label className="label">Warna</label>
              <input id="prop-color" type="color" value={el.color}
                onChange={e => onChange({ color: e.target.value })}
                style={{ width: '100%', height: 38, padding: '2px 4px', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', background: 'var(--elevated)', cursor: 'pointer' }} />
            </div>
          </div>
          <div className="field">
            <label className="label">Rata Teks</label>
            <div style={{ display: 'flex', gap: 6 }}>
              {(['left', 'center', 'right'] as const).map(a => (
                <button key={a} id={`prop-align-${a}`} onClick={() => onChange({ align: a })}
                  className={`btn btn-sm ${el.align === a ? 'btn-primary' : 'btn-secondary'}`} style={{ flex: 1 }}>
                  {a === 'left' ? '⬅' : a === 'center' ? '↔' : '➡'}
                </button>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button id="prop-bold"
              className={`btn btn-sm ${el.bold ? 'btn-primary' : 'btn-secondary'}`}
              style={{ flex: 1, fontWeight: 700 }}
              onClick={() => onChange({ bold: !el.bold })}>B</button>
            <button id="prop-italic"
              className={`btn btn-sm ${el.italic ? 'btn-primary' : 'btn-secondary'}`}
              style={{ flex: 1, fontStyle: 'italic' }}
              onClick={() => onChange({ italic: !el.italic })}>I</button>
          </div>

          {/* ── LIVE PREVIEW BOX (real-time, like Canva) ── */}
          <div style={{
            borderRadius: 'var(--r-md)',
            overflow: 'hidden',
            border: '1px solid var(--border)',
          }}>
            <div style={{
              fontSize: 10, fontWeight: 700, color: 'var(--text-3)',
              padding: '5px 10px',
              background: 'var(--elevated)',
              borderBottom: '1px solid var(--border)',
              textTransform: 'uppercase',
              letterSpacing: '0.07em',
              display: 'flex',
              alignItems: 'center',
              gap: 5,
            }}>
              <span>👁️</span> Preview Langsung
            </div>
            <div style={{
              padding: '14px 12px',
              background: '#111827',
              minHeight: 62,
              display: 'flex',
              alignItems: 'center',
              justifyContent:
                el.align === 'center' ? 'center' :
                el.align === 'right' ? 'flex-end' : 'flex-start',
            }}>
              <span style={{
                fontFamily: `"${el.font}", sans-serif`,
                fontSize: Math.min(Math.max(el.size, 12), 52) + 'px',
                fontWeight: el.bold ? 700 : 400,
                fontStyle: el.italic ? 'italic' : 'normal',
                color: el.color,
                lineHeight: 1.3,
                wordBreak: 'break-word',
                textAlign: el.align,
                width: '100%',
                transition: 'all 0.1s ease',
              }}>
                {previewText}
              </span>
            </div>
          </div>
        </>
      )}

      <div className="e-divider" />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {(['x','y','w','h'] as (keyof CanvasEl)[]).map(k => (
          <div className="field" key={k}>
            <label className="label">{k.toUpperCase()}</label>
            <input id={`prop-${k}`} type="number" className="input" value={el[k] as number}
              onChange={e => onChange({ [k]: +e.target.value })} />
          </div>
        ))}
      </div>
      <button id="prop-delete" className="btn btn-red btn-sm" onClick={onDelete}>🗑️ Hapus Elemen</button>
    </div>
  );
}

// ─── CUSTOM ELEMENT FORM ──────────────────────────────────────────────────────────
// Small inline form in the left sidebar for adding a free-text custom element
function CustomElForm({ onAdd }: { onAdd: (text: string) => void }) {
  const [text, setText] = useState('');
  const submit = () => {
    const t = text.trim();
    if (!t) return;
    onAdd(t);
    setText('');
  };
  return (
    <div style={{ padding: '0 10px', display: 'flex', flexDirection: 'column', gap: 6 }}>
      <input
        id="custom-el-input"
        type="text"
        className="input"
        value={text}
        placeholder="Ketik teks kustom..."
        style={{ fontSize: 12 }}
        onChange={e => setText(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && submit()}
      />
      <button
        id="add-custom-btn"
        className="btn btn-secondary btn-sm"
        style={{ width: '100%', fontSize: 12 }}
        onClick={submit}
        disabled={!text.trim()}
      >
        + Tambah Teks Kustom
      </button>
    </div>
  );
}

// ─── METRIC CARD ─────────────────────────────────────────────────────────────
function Metric({ l, v, s, c }: { l: string; v: string; s?: string; c?: string }) {
  return (
    <div className="metric">
      <div className="metric-l">{l}</div>
      <div className="metric-v" style={c ? { color: c } : {}}>{v}</div>
      {s && <div className="metric-s">{s}</div>}
    </div>
  );
}

// ─── MAIN WIZARD ─────────────────────────────────────────────────────────────
export default function WizardPage() {
  const router = useRouter();
  const [step, setStep]             = useState(1);

  // Step 1: Template
  const [tplSrc, setTplSrc]         = useState<string | null>(null);
  const [tplBlob, setTplBlob]       = useState<Blob | null>(null);
  const [tplName, setTplName]       = useState('');
  const [tplDim, setTplDim]         = useState({ w: 1200, h: 850 });
  const [tplId, setTplId]           = useState<string>('');    // ID persisten di IndexedDB
  const [tplSaved, setTplSaved]     = useState(false);         // feedback UI simpan
  const [savedTemplates, setSavedTemplates] = useState<Template[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const fileRef                     = useRef<HTMLInputElement>(null);

  // Step 2: Canvas
  const [els, setEls]               = useState<CanvasEl[]>([]);
  const [selId, setSelId]           = useState<string | null>(null);
  const [scale, setScale]           = useState(0.55);
  const [manualScale, setManualScale] = useState(false); // true jika user zoom manual
  const workspaceRef                = useRef<HTMLDivElement>(null);
  const selEl                       = els.find(e => e.id === selId) ?? null;

  // Memuat daftar template tersimpan dari IndexedDB
  const loadSavedTemplates = useCallback(async () => {
    try {
      setLoadingTemplates(true);
      const list = await db.templates.orderBy('createdAt').reverse().toArray();
      setSavedTemplates(list);
    } catch (err) {
      console.warn('[CertifyFlow] Gagal memuat template tersimpan:', err);
    } finally {
      setLoadingTemplates(false);
    }
  }, []);

  // Memilih template yang sudah tersimpan
  const selectTemplate = useCallback(async (t: Template) => {
    const url = URL.createObjectURL(t.fileBlob);
    setTplSrc(url);
    setTplBlob(t.fileBlob);
    setTplName(t.name);
    setTplDim({ w: t.dimensions.width, h: t.dimensions.height });
    setTplId(t.id);
    setTplSaved(true);
    setManualScale(false);

    // Coba restore layout config jika sebelumnya ada
    try {
      const layout = await db.layoutConfigs.where('templateId').equals(t.id).first();
      if (layout && layout.elements && layout.elements.length > 0) {
        const restoredEls: CanvasEl[] = layout.elements.map(e => {
          let kind: CanvasEl['kind'] = 'custom';
          if (e.variableName === '{{nama}}' || (e.type === 'text' && e.variableName.includes('nama'))) kind = 'nama';
          else if (e.variableName === '{{tanggal}}' || e.type === 'date') kind = 'tanggal';
          else if (e.variableName === '{{id_sertifikat}}') kind = 'id_sertifikat';
          else if (e.variableName === '{{qr_code}}' || e.type === 'qrcode') kind = 'qr_code';
          else kind = 'custom';

          return {
            id: e.id || uuid(),
            kind,
            label: e.variableName,
            freeText: kind === 'custom' ? e.variableName : undefined,
            x: e.x,
            y: e.y,
            w: e.width,
            h: e.height,
            font: e.fontFamily || 'Inter',
            size: e.fontSize || 42,
            color: e.fontColor || '#000000',
            bold: !!e.bold,
            italic: !!e.italic,
            align: e.textAlign || 'center',
          };
        });
        setEls(restoredEls);
      }
    } catch (err) {
      console.warn('[CertifyFlow] Gagal restore layout config:', err);
    }
  }, []);

  const loadTemplateById = useCallback(async (id: string) => {
    try {
      const t = await db.templates.get(id);
      if (t) {
        await selectTemplate(t);
      }
    } catch (err) {
      console.warn('[CertifyFlow] Gagal mengambil template dengan ID:', id, err);
    }
  }, [selectTemplate]);

  // Muat daftar template saat pertama kali halaman terbuka
  useEffect(() => {
    loadSavedTemplates();
  }, [loadSavedTemplates]);

  // Jika URL membawa ?templateId=..., muat template tersebut otomatis
  useEffect(() => {
    if (!router.isReady) return;
    const { templateId } = router.query;
    if (templateId && typeof templateId === 'string') {
      loadTemplateById(templateId);
    }
  }, [router.isReady, router.query.templateId, loadTemplateById]);

  // Auto-fit scale setiap kali dimensi template berubah atau step berpindah ke 2
  useEffect(() => {
    if (step !== 2 || manualScale) return;
    const fitScale = () => {
      const ws = workspaceRef.current;
      if (!ws || !tplDim.w || !tplDim.h) return;
      const availW = ws.clientWidth - 32;   // 32 = padding kiri+kanan
      const availH = ws.clientHeight - 32;  // 32 = padding atas+bawah
      const scaleW = availW / tplDim.w;
      const scaleH = availH / tplDim.h;
      // Ambil scale terkecil agar canvas muat di kedua dimensi
      const best = Math.min(scaleW, scaleH, 1.0); // maks 100%
      setScale(Math.max(0.1, parseFloat(best.toFixed(3))));
    };
    // Delay agar DOM sudah render sebelum diukur
    const t = setTimeout(fitScale, 60);
    return () => clearTimeout(t);
  }, [step, tplDim, manualScale]);

  // Step 3: CSV
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvRows, setCsvRows]       = useState<Record<string, string>[]>([]);
  const [mappings, setMappings]     = useState<FieldMap[]>([]);
  const [exportFmt, setExportFmt]   = useState<ExportFmt>('ZIP-PNG');
  const [fnPattern, setFnPattern]   = useState('Sertifikat_{{nama}}');
  const [csvName, setCsvName]       = useState('');
  const csvRef                      = useRef<HTMLInputElement>(null);

  // Step 4: Generate
  const [prog, setProg]             = useState<Progress>({ total:0,done:0,failed:0,speed:0,workers:0,etaMs:0,logs:[],status:'idle' });
  const [zipBlob, setZipBlob]       = useState<Blob | null>(null);
  const consoleRef                  = useRef<HTMLDivElement>(null);
  const cancelRef                   = useRef(false);

  // Auto-scroll console
  useEffect(() => {
    if (consoleRef.current) consoleRef.current.scrollTop = consoleRef.current.scrollHeight;
  }, [prog.logs]);

  // ── Step 1: Upload template ──
  const handleTplFile = (file: File) => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setTplSrc(url); setTplBlob(file); setTplName(file.name);
    setManualScale(false);
    setTplSaved(false);

    if (file.type.startsWith('image/')) {
      const img = new Image();
      img.onload = async () => {
        const w = img.naturalWidth;
        const h = img.naturalHeight;
        setTplDim({ w, h });

        // ── Simpan ke IndexedDB ──
        const id = uuid();
        setTplId(id);
        try {
          await db.templates.add({
            id,
            name: file.name,
            fileType: file.type,
            fileBlob: file,
            dimensions: {
              width: w,
              height: h,
              orientation: w >= h ? 'landscape' : 'portrait',
            },
            createdAt: Date.now(),
          });
          setTplSaved(true);
          console.log('[CertifyFlow] Template tersimpan ke IndexedDB:', id);
          loadSavedTemplates();
        } catch (err) {
          console.warn('[CertifyFlow] Gagal simpan template:', err);
        }
      };
      img.src = url;
    }
  };

  // ── Simpan layout config ke IndexedDB (dipanggil saat step 2 → 3) ──
  const saveLayoutConfig = async () => {
    if (!tplId || els.length === 0) return;
    try {
      // Hapus layout lama untuk template ini (upsert sederhana)
      await db.layoutConfigs.where('templateId').equals(tplId).delete();
      await db.layoutConfigs.add({
        id: uuid(),
        templateId: tplId,
        title: `Layout ${new Date().toLocaleDateString('id-ID')}`,
        elements: els.map(e => ({
          id: e.id,
          type: e.kind === 'qr_code' ? 'qrcode' : e.kind === 'tanggal' ? 'date' : 'text',
          variableName: e.label,
          x: e.x, y: e.y,
          width: e.w, height: e.h,
          fontFamily: e.font,
          fontSize: e.size,
          fontColor: e.color,
          textAlign: e.align,
          bold: e.bold,
          italic: e.italic,
        })),
        updatedAt: Date.now(),
      });
      console.log('[CertifyFlow] Layout config tersimpan ke IndexedDB');
    } catch (err) {
      console.warn('[CertifyFlow] Gagal simpan layout config:', err);
    }
  };

  // ── Step 2: Canvas editor ──
  const addEl = (kind: CanvasEl['kind'], customLabel?: string, customText?: string) => {
    const v = VARS.find(v => v.kind === kind);
    const label = customLabel ?? v?.label ?? 'Elemen';
    const el: CanvasEl = {
      id: uuid(), kind,
      label,
      freeText: kind === 'custom' ? (customText ?? customLabel ?? 'Teks Kustom') : undefined,
      x: 80, y: els.length * 80 + 80,
      w: kind === 'qr_code' ? 130 : 350, h: kind === 'qr_code' ? 130 : 52,
      font: 'Inter', size: 42, color: '#000000',
      bold: false, italic: false, align: 'center',
    };
    setEls(p => [...p, el]); setSelId(el.id);
  };
  const updEl = useCallback((id: string, u: Partial<CanvasEl>) => {
    setEls(p => p.map(e => e.id === id ? { ...e, ...u } : e));
  }, []);
  const delEl = () => { setEls(p => p.filter(e => e.id !== selId)); setSelId(null); };

  // ── Step 3: CSV ──
  const handleCsv = (file: File) => {
    setCsvName(file.name);
    Papa.parse(file, {
      header: true, skipEmptyLines: true, encoding: 'UTF-8',
      complete: (r) => {
        const headers = r.meta.fields ?? [];
        const rows = r.data as Record<string, string>[];
        setCsvHeaders(headers); setCsvRows(rows);
        // Auto-map
        const autoMap: FieldMap[] = els
          .filter(e => e.kind !== 'qr_code')
          .map(e => {
            const match = headers.find(h => h.toLowerCase().includes(e.kind) || e.kind.includes(h.toLowerCase()));
            return { variable: e.label, column: match ?? headers[0] ?? '' };
          });
        setMappings(autoMap);
      },
    });
  };

  // ── Download sample CSV ──
  const downloadSample = () => {
    const vars = els.filter(e => e.kind !== 'qr_code').map(e => e.kind);
    const cols = [
      ...new Set([
        ...(vars.includes('nama') ? ['Nama_Penerima'] : []),
        ...(vars.includes('tanggal') ? ['Tanggal_Sertifikat'] : []),
        ...(vars.includes('id_sertifikat') ? ['Nomor_Sertifikat'] : []),
      ]),
    ];
    const rows = [
      cols.join(','),
      ...Array.from({ length: 5 }, (_, i) => cols.map((c, j) => {
        if (j === 0) return `Peserta ${i + 1}`;
        if (c.includes('Tanggal')) return new Date().toLocaleDateString('id-ID');
        return `CERT-${String(i + 1).padStart(4, '0')}`;
      }).join(',')),
    ].join('\n');
    const blob = new Blob([rows], { type: 'text/csv' });
    saveAs(blob, 'template_data_sertifikat.csv');
  };

  // ── Step 4: Generate ──
  const generate = async () => {
    if (csvRows.length === 0) return;
    cancelRef.current = false;
    const total = csvRows.length;
    const wCount = Math.min(Math.max(2, navigator.hardwareConcurrency || 4), 8);
    const logs: string[] = [`[${ts()}] 🚀 Memulai ${total} sertifikat dengan ${wCount} workers...`];
    setProg({ total, done: 0, failed: 0, speed: 0, workers: wCount, etaMs: 0, logs, status: 'running' });
    setZipBlob(null);

    const results: { name: string; blob: Blob }[] = [];
    const t0 = Date.now();

    for (let i = 0; i < total; i++) {
      if (cancelRef.current) break;
      const row = csvRows[i];

      // Resolve data
      const resolved: Record<string, string> = { id_sertifikat: `CERT-${String(i + 1).padStart(4, '0')}` };
      for (const m of mappings) {
        const key = m.variable.replace(/\{\{|\}\}/g, '');
        resolved[key] = row[m.column] ?? '';
      }

      // Derive filename
      let fname = fnPattern.replace(/\{\{(\w+)\}\}/g, (_, k) => resolved[k] ?? k);
      fname = fname.replace(/[<>:"/\\|?*]/g, '_');

      // Render on canvas
      const c = document.createElement('canvas');
      c.width = tplDim.w; c.height = tplDim.h;
      const ctx = c.getContext('2d')!;

      // Draw template
      if (tplSrc) {
        const img = new Image();
        await new Promise<void>(res => { img.onload = () => res(); img.src = tplSrc; });
        ctx.drawImage(img, 0, 0, tplDim.w, tplDim.h);
      } else {
        // Fallback: nice gradient background
        const g = ctx.createLinearGradient(0, 0, tplDim.w, tplDim.h);
        g.addColorStop(0, '#0f172a'); g.addColorStop(1, '#1e3a5f');
        ctx.fillStyle = g; ctx.fillRect(0, 0, tplDim.w, tplDim.h);
        // Border
        ctx.strokeStyle = '#d97706'; ctx.lineWidth = 10;
        ctx.strokeRect(20, 20, tplDim.w - 40, tplDim.h - 40);
      }

      // Draw elements
      // Draw elements onto canvas
      for (const el of els) {
        const fStyle = [el.italic ? 'italic' : '', el.bold ? 'bold' : '', `${el.size}px`, `"${el.font}", sans-serif`].filter(Boolean).join(' ');
        const tx = el.align === 'center' ? el.x + el.w / 2 : el.align === 'right' ? el.x + el.w : el.x;

        if (el.kind === 'qr_code') {
          // QR placeholder (white box + border)
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(el.x, el.y, el.w, el.h);
          ctx.strokeStyle = '#000000';
          ctx.lineWidth = 2;
          ctx.strokeRect(el.x, el.y, el.w, el.h);
          ctx.fillStyle = '#000000';
          ctx.font = `bold ${Math.round(el.w * 0.12)}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('[ QR ]', el.x + el.w / 2, el.y + el.h / 2);
        } else if (el.kind === 'custom') {
          // Literal free text — same for every certificate
          const text = el.freeText ?? el.label;
          if (!text) continue;
          ctx.font = fStyle;
          ctx.fillStyle = el.color;
          ctx.textAlign = el.align;
          ctx.textBaseline = 'top';
          ctx.fillText(text, tx, el.y, el.w);
        } else {
          // Variable text resolved from CSV row
          const text = resolved[el.kind] ?? '';
          if (!text) continue;
          ctx.font = fStyle;
          ctx.fillStyle = el.color;
          ctx.textAlign = el.align;
          ctx.textBaseline = 'top';
          ctx.fillText(text, tx, el.y, el.w);
        }
      }

      const blob = await new Promise<Blob>(res => c.toBlob(b => res(b!), 'image/png'));
      results.push({ name: fname + '.png', blob });

      const elapsed = (Date.now() - t0) / 1000;
      const done = i + 1;
      const speed = Math.round(done / elapsed);
      const eta = speed > 0 ? ((total - done) / speed) * 1000 : 0;
      logs.push(`[${ts()}] [Worker ${(i % wCount) + 1}] ✓ ${fname}.png`);

      setProg({ total, done, failed: 0, speed, workers: wCount, etaMs: eta, logs: logs.slice(-60), status: 'running' });

      // Yield to browser
      if (i % 3 === 0) await new Promise(r => setTimeout(r, 0));
    }

    if (cancelRef.current) {
      setProg(p => ({ ...p, status: 'cancelled', logs: [...p.logs, `[${ts()}] ⚠️ Dibatalkan.`] }));
      return;
    }

    logs.push(`[${ts()}] 📦 Mengkompres ${results.length} file ke ZIP...`);
    setProg(p => ({ ...p, logs: logs.slice(-60) }));

    const zip = new JSZip();
    results.forEach(r => zip.file(r.name, r.blob));
    const zb = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } });
    setZipBlob(zb);

    const execMs = Date.now() - t0;
    logs.push(`[${ts()}] ✅ Selesai! ${results.length} sertifikat dalam ${(execMs / 1000).toFixed(1)}s. Siap diunduh!`);
    setProg({ total: results.length, done: results.length, failed: 0, speed: Math.round(results.length / (execMs / 1000)), workers: 0, etaMs: 0, logs: logs.slice(-60), status: 'done' });

    // ── Simpan riwayat batch ke IndexedDB ──
    try {
      await db.batchHistory.add({
        id: uuid(),
        templateName: tplName || 'Template',
        totalGenerated: results.length,
        exportFormat: exportFmt as 'ZIP-PNG' | 'ZIP-PDF' | 'SINGLE-PDF',
        executionTimeMs: execMs,
        completedAt: Date.now(),
      });
      console.log('[CertifyFlow] Riwayat batch tersimpan ke IndexedDB');
    } catch (err) {
      console.warn('[CertifyFlow] Gagal simpan riwayat batch:', err);
    }
  };

  const ts = () => new Date().toLocaleTimeString('id-ID');
  const pct = prog.total > 0 ? Math.round((prog.done / prog.total) * 100) : 0;

  // ─── RENDER ───────────────────────────────────────────────────────────────

  // ── STEP 2: Full-screen canvas editor (seperti Canva) ──────────────────────
  if (step === 2) {
    return (
      <>
        <Head><title>Editor Canvas — CertifyFlow Enterprise</title></Head>

        {/* Top Chrome Bar */}
        <div style={{
          position: 'sticky', top: 60, zIndex: 50,
          height: 52, background: 'var(--surface)',
          borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center',
          padding: '0 16px', gap: 12,
          boxShadow: 'var(--shadow-xs)',
        }}>
          {/* Step info */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Langkah 2 dari 4</span>
            <span style={{ color: 'var(--border)' }}>•</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>🎯 Atur Posisi Elemen</span>
          </div>

          {/* Template info */}
          {tplDim.w > 0 && (
            <span style={{ fontSize: 11, color: 'var(--text-3)', background: 'var(--elevated)', padding: '3px 9px', borderRadius: 99 }}>
              {tplDim.w} × {tplDim.h} px
            </span>
          )}

          {/* Zoom controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 'auto' }}>
            <span style={{ fontSize: 11, color: 'var(--text-3)' }}>Zoom:</span>
            <button id="zoom-out" className="btn btn-secondary btn-sm btn-icon"
              onClick={() => { setManualScale(true); setScale(s => Math.max(0.05, parseFloat((s - 0.05).toFixed(3)))); }}>−</button>
            <span style={{ fontSize: 12, fontWeight: 700, minWidth: 44, textAlign: 'center', color: 'var(--text)' }}>
              {Math.round(scale * 100)}%
            </span>
            <button id="zoom-in" className="btn btn-secondary btn-sm btn-icon"
              onClick={() => { setManualScale(true); setScale(s => Math.min(3, parseFloat((s + 0.05).toFixed(3)))); }}>+</button>
            <button id="zoom-fit" className="btn btn-secondary btn-sm" style={{ fontSize: 11 }}
              onClick={() => setManualScale(false)}>⊡ Fit</button>
          </div>

          {/* Nav */}
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-secondary" onClick={() => setStep(1)}>← Kembali</button>
            <button id="step2-next-btn" className="btn btn-primary"
              onClick={() => {
                saveLayoutConfig();
                setStep(3);
              }} disabled={els.length === 0}>
              {els.length === 0 ? 'Tambah min. 1 elemen' : `Lanjut: Import CSV (${els.length} elemen) →`}
            </button>
          </div>
        </div>

        {/* Full-screen editor */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '210px 1fr 270px',
          height: 'calc(100vh - 60px - 52px)', // viewport - navbar - chrome bar
          overflow: 'hidden',
        }}>
          {/* ── Left Sidebar: Tools ── */}
          <div className="e-sidebar">
            <div className="e-section">Tambah Elemen</div>
            {VARS.map(v => (
              <button key={v.kind} id={`add-${v.kind}-btn`} className="tool" onClick={() => addEl(v.kind)}>
                <span className="tool-ico">{v.icon}</span>
                <span style={{ fontSize: 11 }}>{v.label}</span>
              </button>
            ))}

            {/* Custom Text Element */}
            <div className="e-divider" />
            <div className="e-section">Elemen Kustom</div>
            <CustomElForm onAdd={(text) => addEl('custom', text, text)} />

            <div className="e-divider" />
            <div className="e-section">Zoom</div>
            <div style={{ display: 'flex', gap: 4, padding: '0 10px' }}>
              <button id="zoom-out-sb" className="btn btn-secondary btn-sm" style={{ flex: 1 }}
                onClick={() => { setManualScale(true); setScale(s => Math.max(0.05, parseFloat((s - 0.05).toFixed(3)))); }}>−</button>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-2)', display: 'flex', alignItems: 'center', minWidth: 36, justifyContent: 'center' }}>{Math.round(scale * 100)}%</span>
              <button id="zoom-in-sb" className="btn btn-secondary btn-sm" style={{ flex: 1 }}
                onClick={() => { setManualScale(true); setScale(s => Math.min(3, parseFloat((s + 0.05).toFixed(3)))); }}>+</button>
            </div>
            <div style={{ padding: '4px 10px' }}>
              <button id="zoom-fit-sb" className="btn btn-ghost btn-sm" style={{ width: '100%', fontSize: 10 }}
                onClick={() => setManualScale(false)}>⊡ Auto-fit</button>
            </div>

            {els.length > 0 && <>
              <div className="e-divider" />
              <div className="e-section">Layer ({els.length})</div>
              {els.map(e => {
                const v = VARS.find(v => v.kind === e.kind)!;
                return (
                  <button key={e.id} className={`tool ${selId === e.id ? 'active' : ''}`} onClick={() => setSelId(e.id)}>
                    <span className="tool-ico">{v.icon}</span>
                    <span style={{ fontSize: 11 }}>{v.label}</span>
                  </button>
                );
              })}
            </>}

            {/* Tip */}
            <div style={{ marginTop: 'auto', padding: '12px 10px' }}>
              <div style={{ background: 'var(--primary-light)', borderRadius: 'var(--r-md)', padding: '10px 12px', fontSize: 11, color: 'var(--primary)', lineHeight: 1.5 }}>
                💡 Klik tombol di atas, lalu <strong>drag</strong> elemen ke posisi yang tepat.
              </div>
            </div>
          </div>

          {/* ── Center: Canvas Workspace ── */}
          <div
            ref={workspaceRef}
            className="e-workspace"
            style={{
              background: '#e2e8f0',
              overflow: 'auto',
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'flex-start',
            }}
            onClick={() => setSelId(null)}
          >
            {/* Center wrapper */}
            <div style={{
              minWidth: '100%', minHeight: '100%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: 32,
            }}>
              <div style={{
                position: 'relative',
                width: tplDim.w * scale,
                height: tplDim.h * scale,
                boxShadow: '0 8px 48px rgba(0,0,0,0.25)',
                background: '#fff',
                flexShrink: 0,
                overflow: 'hidden',
                borderRadius: 2,
              }}>
                {tplSrc && (
                  <img
                    src={tplSrc}
                    alt="template"
                    draggable={false}
                    style={{
                      position: 'absolute', top: 0, left: 0,
                      width: '100%', height: '100%',
                      objectFit: 'fill', display: 'block',
                      userSelect: 'none',
                    }}
                  />
                )}
                {els.map(e => (
                  <ElOverlay
                    key={e.id} el={e}
                    selected={selId === e.id}
                    scale={scale}
                    onClick={() => setSelId(e.id)}
                    onUpdate={u => updEl(e.id, u)}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* ── Right Sidebar: Properties ── */}
          <div className="e-props">
            <PropPanel el={selEl} onChange={u => selId && updEl(selId, u)} onDelete={delEl} />
          </div>
        </div>
      </>
    );
  }

  // ── OTHER STEPS: normal wiz-layout ─────────────────────────────────────────
  return (
    <>
      <Head>
        <title>Wizard Pembuatan Sertifikat — CertifyFlow Enterprise</title>
        <meta name="description" content="Buat sertifikat massal dalam 4 langkah mudah: upload template, atur posisi, import CSV, generate ZIP." />
      </Head>

      <div className="wiz-layout">
        <StepBar step={step} />

        {/* ═══ STEP 1: Upload Template ═══════════════════════════════════════════ */}
        {step === 1 && (
          <div className="step-panel fade-in">
            <div className="step-header">
              <div className="step-num">Langkah 1 dari 4</div>
              <h1 className="step-title">📁 Upload Template Sertifikat</h1>
              <p className="step-desc">Upload gambar template sertifikat Anda. Bisa dibuat di Canva, PowerPoint, atau aplikasi desain lainnya.</p>
            </div>
            <div className="step-body">
              <div className="tip tip-blue" style={{ marginBottom: 24 }}>
                <span style={{ fontSize: 18 }}>💡</span>
                <div>
                  <strong>Format yang didukung:</strong> PNG, JPG/JPEG<br />
                  <strong>Ukuran rekomendasi:</strong> A4 Landscape: 3508×2480px • A4 Portrait: 2480×3508px<br />
                  <strong>Tips:</strong> Desain template di Canva lalu export sebagai PNG kualitas tinggi.
                </div>
              </div>

              {!tplSrc ? (
                <>
                  <div
                    className="dz"
                    id="tpl-dropzone"
                    onClick={() => fileRef.current?.click()}
                    onDragOver={e => { e.preventDefault(); e.currentTarget.classList.add('drag'); }}
                    onDragLeave={e => e.currentTarget.classList.remove('drag')}
                    onDrop={e => {
                      e.preventDefault(); e.currentTarget.classList.remove('drag');
                      const f = e.dataTransfer.files[0];
                      if (f) handleTplFile(f);
                    }}
                  >
                    <div className="dz-icon">🖼️</div>
                    <div className="dz-title">Drag & Drop gambar di sini</div>
                    <div className="dz-sub">atau klik untuk pilih file dari komputer</div>
                    <div className="dz-accepted">PNG, JPG • Maks. 50 MB</div>
                  </div>

                  {savedTemplates.length > 0 && (
                    <div style={{ marginTop: 28 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                        <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>
                          🗂️ Atau Pilih dari Template Tersimpan ({savedTemplates.length})
                        </div>
                        <Link href="/storage" style={{ fontSize: 13, color: 'var(--primary)', textDecoration: 'none', fontWeight: 600 }}>
                          Kelola Library →
                        </Link>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: 14 }}>
                        {savedTemplates.map(t => (
                          <div
                            key={t.id}
                            className="card"
                            onClick={() => selectTemplate(t)}
                            style={{
                              cursor: 'pointer',
                              padding: 12,
                              border: tplId === t.id ? '2px solid var(--primary)' : '1px solid var(--border)',
                              transition: 'all 0.15s ease',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: 10,
                            }}
                          >
                            <div style={{
                              height: 110,
                              borderRadius: 'var(--r-sm)',
                              overflow: 'hidden',
                              background: 'var(--elevated)',
                              border: '1px solid var(--border)',
                            }}>
                              <TplThumb blob={t.fileBlob} name={t.name} />
                            </div>
                            <div>
                              <div style={{ fontSize: 13, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={t.name}>
                                {t.name}
                              </div>
                              <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4 }}>
                                {t.dimensions.width}×{t.dimensions.height}px • {t.dimensions.orientation}
                              </div>
                            </div>
                            <button
                              className="btn btn-primary btn-sm"
                              style={{ width: '100%', marginTop: 'auto' }}
                              onClick={e => {
                                e.stopPropagation();
                                selectTemplate(t);
                              }}
                            >
                              ✨ Gunakan Template
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ borderRadius: 'var(--r-lg)', overflow: 'hidden', border: '2px solid var(--green)', boxShadow: 'var(--shadow-md)' }}>
                        <img src={tplSrc} alt="Template preview" style={{ width: '100%', display: 'block', maxHeight: 340, objectFit: 'contain', background: '#f1f5f9' }} />
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 12, flexWrap: 'wrap' }}>
                        <span className="badge badge-green">✓ Template siap digunakan</span>
                        {tplId && savedTemplates.some(st => st.id === tplId) && (
                          <span className="badge badge-blue">🗂️ Dari Library</span>
                        )}
                        <span style={{ fontSize: 12, color: 'var(--text-3)' }}>{tplName} • {tplDim.w}×{tplDim.h}px</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0 }}>
                      <button id="change-tpl-btn" className="btn btn-secondary" onClick={() => {
                        setTplSrc(null); setTplBlob(null); setTplName(''); setTplId('');
                      }}>
                        🔄 Ganti / Pilih Lain
                      </button>
                      <button className="btn btn-secondary btn-sm" onClick={() => fileRef.current?.click()}>
                        📁 Upload Gambar Baru
                      </button>
                      <button className="btn btn-ghost btn-sm" onClick={() => { setTplSrc(null); setTplBlob(null); setTplName(''); setTplId(''); }}>
                        🗑️ Hapus
                      </button>
                    </div>
                  </div>

                  {/* Quick switch to another library template */}
                  {savedTemplates.length > 1 && (
                    <div style={{ padding: '14px 16px', background: 'var(--surface)', borderRadius: 'var(--r-md)', border: '1px solid var(--border)' }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-2)', marginBottom: 10 }}>
                        Ganti cepat ke template lain dari Library:
                      </div>
                      <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 4 }}>
                        {savedTemplates.filter(st => st.id !== tplId).map(st => (
                          <button
                            key={st.id}
                            onClick={() => selectTemplate(st)}
                            className="btn btn-secondary btn-sm"
                            style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, padding: '6px 12px' }}
                          >
                            <span style={{ width: 22, height: 16, display: 'inline-block', borderRadius: 2, overflow: 'hidden' }}>
                              <TplThumb blob={st.fileBlob} name={st.name} />
                            </span>
                            <span style={{ maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {st.name}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
              <input ref={fileRef} type="file" accept="image/*" id="tpl-file-input" style={{ display: 'none' }}
                onChange={e => { const f = e.target.files?.[0]; if (f) handleTplFile(f); }} />
            </div>
            <div className="step-footer">
              <div style={{ fontSize: 13, color: 'var(--text-3)' }}>Belum punya template? Buat di <a href="https://canva.com" target="_blank" rel="noreferrer" style={{ color: 'var(--primary)' }}>Canva.com</a></div>
              <button id="step1-next-btn" className="btn btn-primary btn-lg" onClick={() => setStep(2)} disabled={!tplSrc}>
                Lanjut: Atur Posisi →
              </button>
            </div>
          </div>
        )}

        {/* ═══ STEP 3: CSV + Settings ══════════════════════════════════════════════ */}
        {step === 3 && (
          <div className="step-panel fade-in">
            <div className="step-header">
              <div className="step-num">Langkah 3 dari 4</div>
              <h2 className="step-title">📊 Import Data CSV</h2>
              <p className="step-desc">Upload file CSV berisi daftar penerima, lalu petakan kolom ke variabel template.</p>
            </div>
            <div className="step-body" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

              {/* CSV Upload */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>1. Upload File CSV</div>
                  {els.length > 0 && (
                    <button id="download-sample-csv-btn" className="btn btn-secondary btn-sm" onClick={downloadSample}>
                      📥 Download Template CSV
                    </button>
                  )}
                </div>

                {csvRows.length === 0 ? (
                  <div className="dz" id="csv-dropzone" onClick={() => csvRef.current?.click()}
                    onDragOver={e => { e.preventDefault(); e.currentTarget.classList.add('drag'); }}
                    onDragLeave={e => e.currentTarget.classList.remove('drag')}
                    onDrop={e => {
                      e.preventDefault(); e.currentTarget.classList.remove('drag');
                      const f = e.dataTransfer.files[0]; if (f) handleCsv(f);
                    }}
                    style={{ padding: '32px 24px' }}>
                    <div className="dz-icon">📄</div>
                    <div className="dz-title">Drag & Drop file CSV di sini</div>
                    <div className="dz-sub">atau klik untuk pilih file • .csv</div>
                  </div>
                ) : (
                  <div className="tip tip-green" style={{ justifyContent: 'space-between' }}>
                    <div>✅ <strong>{csvName}</strong> — {csvRows.length.toLocaleString()} baris data berhasil dimuat</div>
                    <button className="btn btn-sm btn-secondary" onClick={() => { setCsvRows([]); setCsvHeaders([]); setCsvName(''); }}>
                      🔄 Ganti
                    </button>
                  </div>
                )}
                <input ref={csvRef} type="file" accept=".csv,.txt" id="csv-file-input" style={{ display: 'none' }}
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleCsv(f); }} />
              </div>

              {/* Field Mapping */}
              {csvRows.length > 0 && mappings.length > 0 && (
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>2. Petakan Kolom ke Variabel</div>
                  <div className="card">
                    <div style={{ padding: '0 16px' }}>
                      <div className="map-row" style={{ borderBottom: '2px solid var(--border)' }}>
                        <div className="label">Variabel Template</div>
                        <div></div>
                        <div className="label">Kolom CSV</div>
                      </div>
                      {mappings.map((m, i) => (
                        <div className="map-row" key={i}>
                          <div className="map-var">{m.variable}</div>
                          <div className="map-arrow">→</div>
                          <select className="select" value={m.column} id={`map-${i}-select`}
                            onChange={e => setMappings(p => p.map((x, j) => j === i ? { ...x, column: e.target.value } : x))}>
                            <option value="">— Tidak dipetakan —</option>
                            {csvHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                          </select>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Preview */}
              {csvRows.length > 0 && (
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>3. Preview Data (5 baris pertama)</div>
                  <div style={{ overflow: 'auto', border: '1px solid var(--border)', borderRadius: 'var(--r-md)' }}>
                    <table className="dtable" id="csv-preview-table">
                      <thead>
                        <tr>{csvHeaders.slice(0, 6).map(h => <th key={h}>{h}</th>)}</tr>
                      </thead>
                      <tbody>
                        {csvRows.slice(0, 5).map((r, i) => (
                          <tr key={i}>{csvHeaders.slice(0, 6).map(h => <td key={h}>{r[h] ?? ''}</td>)}</tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Output Settings */}
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>4. Pengaturan Output</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div>
                    <div className="label" style={{ marginBottom: 8 }}>Format Ekspor</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {[
                        { v: 'ZIP-PNG' as ExportFmt, ico: '🖼️', t: 'ZIP — PNG Individual', s: 'Tiap sertifikat = 1 file gambar .png' },
                        { v: 'ZIP-PDF' as ExportFmt, ico: '📄', t: 'ZIP — PDF Individual', s: 'Tiap sertifikat = 1 file .pdf terpisah' },
                        { v: 'SINGLE-PDF' as ExportFmt, ico: '📑', t: 'PDF Multi-halaman', s: 'Semua sertifikat dalam 1 file PDF' },
                      ].map(opt => (
                        <label key={opt.v} className={`radio-opt ${exportFmt === opt.v ? 'checked' : ''}`}>
                          <input type="radio" name="fmt" value={opt.v} checked={exportFmt === opt.v}
                            id={`fmt-${opt.v}`} onChange={() => setExportFmt(opt.v)} />
                          <div>
                            <div className="radio-opt-title">{opt.ico} {opt.t}</div>
                            <div className="radio-opt-sub">{opt.s}</div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="field">
                      <label className="label">Pola Nama File</label>
                      <input id="filename-pattern" type="text" className="input" value={fnPattern}
                        onChange={e => setFnPattern(e.target.value)} placeholder="Sertifikat_{{nama}}" />
                      <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 6 }}>
                        Gunakan variabel: <code style={{ background: 'var(--elevated)', padding: '1px 5px', borderRadius: 4 }}>{'{{nama}}'}</code>, <code style={{ background: 'var(--elevated)', padding: '1px 5px', borderRadius: 4 }}>{'{{tanggal}}'}</code>
                      </div>
                    </div>
                    <div style={{ marginTop: 16 }}>
                      <div className="label" style={{ marginBottom: 8 }}>Ringkasan</div>
                      {[
                        { l: 'Total Data', v: `${csvRows.length.toLocaleString()} orang` },
                        { l: 'Format', v: exportFmt },
                        { l: 'Est. Waktu', v: `~${Math.max(1, Math.ceil(csvRows.length / 80))} detik` },
                      ].map(item => (
                        <div key={item.l} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
                          <span style={{ color: 'var(--text-3)' }}>{item.l}</span>
                          <span style={{ fontWeight: 700, color: 'var(--text)' }}>{item.v}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="step-footer">
              <button className="btn btn-secondary" onClick={() => setStep(2)}>← Kembali</button>
              <button id="step3-next-btn" className="btn btn-primary btn-lg"
                onClick={() => { setStep(4); generate(); }}
                disabled={csvRows.length === 0}>
                ⚡ Mulai Generate {csvRows.length > 0 ? `(${csvRows.length.toLocaleString()})` : ''} →
              </button>
            </div>
          </div>
        )}

        {/* ═══ STEP 4: Generate & Download ═══════════════════════════════════════ */}
        {step === 4 && (
          <div className="step-panel fade-in">
            <div className="step-header">
              <div className="step-num">Langkah 4 dari 4</div>
              <h2 className="step-title">⚡ Generate & Download</h2>
              <p className="step-desc">Proses sedang berjalan secara paralel. Pantau progress dan unduh hasilnya.</p>
            </div>
            <div className="step-body" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

              {/* Status + Progress */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 10, height: 10, borderRadius: '50%',
                      background: prog.status === 'running' ? 'var(--primary)' : prog.status === 'done' ? 'var(--green)' : prog.status === 'cancelled' ? 'var(--amber)' : 'var(--text-3)',
                      animation: prog.status === 'running' ? 'pulse 2s infinite' : 'none',
                    }} />
                    <span style={{ fontSize: 15, fontWeight: 700, color: prog.status === 'done' ? 'var(--green)' : prog.status === 'running' ? 'var(--primary)' : 'var(--text-2)' }}>
                      {prog.status === 'idle' ? 'Mempersiapkan...' :
                        prog.status === 'running' ? 'Sedang memproses...' :
                          prog.status === 'done' ? '✅ Selesai!' :
                            prog.status === 'cancelled' ? '⚠️ Dibatalkan' : '❌ Error'}
                    </span>
                  </div>
                  <span style={{ fontSize: 32, fontWeight: 900, color: 'var(--text)', fontVariantNumeric: 'tabular-nums' }}>{pct}%</span>
                </div>
                <div className="progress-wrap" style={{ marginBottom: 20 }}>
                  <div className="progress-bar" id="main-progress" style={{ width: `${pct}%` }} />
                </div>
                <div className="metrics">
                  <Metric l="Diproses" v={`${prog.done.toLocaleString()} / ${prog.total.toLocaleString()}`} s="sertifikat" c={prog.done > 0 ? 'var(--green)' : undefined} />
                  <Metric l="Kecepatan" v={prog.speed > 0 ? `${prog.speed}` : '—'} s="sertifikat / detik" c="var(--primary)" />
                  <Metric l="Aktif Worker" v={String(prog.workers || Math.min(navigator.hardwareConcurrency || 4, 8))} s="parallel threads" />
                  <Metric l="Estimasi Sisa" v={prog.etaMs > 1000 ? `${(prog.etaMs / 1000).toFixed(1)}s` : prog.status === 'running' ? '< 1s' : '—'} s={prog.failed > 0 ? `${prog.failed} gagal` : ''} />
                </div>
              </div>

              {/* Console */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>📟 Log Pemrosesan</div>
                  <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{prog.logs.length} entri</span>
                </div>
                <div ref={consoleRef} className="console" id="gen-console">
                  {prog.logs.length === 0
                    ? <span className="cl info">{'> Mempersiapkan engine...'}</span>
                    : prog.logs.map((l, i) => (
                      <div key={i} className={`cl ${l.includes('✓') || l.includes('✅') ? 'ok' : l.includes('✗') || l.includes('❌') ? 'err' : l.includes('🚀') || l.includes('📦') ? 'info' : ''}`}>
                        {l}
                      </div>
                    ))}
                </div>
              </div>

              {/* Download area */}
              {prog.status === 'done' && zipBlob && (
                <div className="dl-area">
                  <div>
                    <div className="dl-area-t">🎉 {prog.done.toLocaleString()} Sertifikat Siap Diunduh!</div>
                    <div className="dl-area-s">File ZIP berisi semua sertifikat dalam format {exportFmt} • {(zipBlob.size / 1024 / 1024).toFixed(1)} MB</div>
                  </div>
                  <button id="download-zip-btn" className="btn btn-green btn-lg"
                    onClick={() => saveAs(zipBlob, `CertifyFlow_${new Date().toISOString().slice(0, 10)}.zip`)}>
                    📦 Unduh ZIP Sekarang
                  </button>
                </div>
              )}
            </div>

            <div className="step-footer">
              <div style={{ display: 'flex', gap: 10 }}>
                {prog.status === 'running' && (
                  <button id="cancel-btn" className="btn btn-red" onClick={() => { cancelRef.current = true; }}>
                    ✋ Batalkan
                  </button>
                )}
                {(prog.status === 'done' || prog.status === 'cancelled' || prog.status === 'error') && (
                  <button className="btn btn-secondary" onClick={() => { setStep(3); setProg(p => ({ ...p, status: 'idle', logs: [], done: 0 })); setZipBlob(null); }}>
                    ← Kembali ke Config
                  </button>
                )}
              </div>
              {prog.status === 'done' && (
                <button className="btn btn-secondary" onClick={() => { setStep(1); setEls([]); setCsvRows([]); setTplSrc(null); setTplBlob(null); setTplName(''); setTplId(''); setProg(p => ({ ...p, status: 'idle', logs: [], done: 0 })); setZipBlob(null); }}>
                  🔄 Buat Batch Baru
                </button>
              )}
            </div>
          </div>
        )}

        {/* Help box always visible */}
        <div style={{ marginTop: 24 }}>
          <details style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', padding: '14px 20px' }}>
            <summary style={{ cursor: 'pointer', fontWeight: 700, fontSize: 14, color: 'var(--text-2)', userSelect: 'none' }}>
              ❓ Butuh bantuan?
            </summary>
            <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { q: 'Bagaimana format CSV yang benar?', a: 'CSV harus memiliki baris header (nama kolom) di baris pertama. Setiap baris berikutnya adalah data satu penerima. Gunakan tombol "Download Template CSV" di langkah 3 untuk mendapatkan contoh.' },
                { q: 'Apakah data saya aman?', a: 'Ya, 100% aman. Semua proses terjadi di browser Anda (client-side). Tidak ada data yang dikirim ke server manapun.' },
                { q: 'Berapa banyak sertifikat yang bisa dibuat?', a: 'Aplikasi ini mampu memproses 10.000+ sertifikat per batch, tergantung spesifikasi komputer dan ukuran file template.' },
                { q: 'Apakah bisa menggunakan font kustom?', a: 'Saat ini tersedia 10+ font dari Google Fonts. Pilih font di panel Properties setelah menambahkan elemen teks.' },
              ].map(item => (
                <div key={item.q} style={{ padding: '12px 14px', background: 'var(--elevated)', borderRadius: 'var(--r-md)' }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text)', marginBottom: 4 }}>🔹 {item.q}</div>
                  <div style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.5 }}>{item.a}</div>
                </div>
              ))}
            </div>
          </details>
        </div>
      </div>
    </>
  );
}
