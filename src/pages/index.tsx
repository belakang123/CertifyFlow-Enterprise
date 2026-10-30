import Head from 'next/head';
import Link from 'next/link';
import { getSiteUrl } from '@/lib/site';
import {
  RocketIcon,
  SparklesIcon,
  BookOpenIcon,
  PaletteIcon,
  ZapIcon,
  BarChartIcon,
  ShieldCheckIcon,
  PackageIcon,
  GlobeIcon,
  FolderIcon,
  TargetIcon,
  LightbulbIcon,
} from '@/components/Icons';

export default function Home() {
  const siteUrl = getSiteUrl();
  const description = 'Buat sertifikat massal otomatis: desain dengan editor visual, impor data CSV, lalu unduh PDF atau ZIP. Gratis, privat, dan diproses langsung di browser.';
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'CertifyFlow',
    description,
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    inLanguage: 'id-ID',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'IDR',
    },
    ...(siteUrl ? { url: siteUrl } : {}),
  };

  const features = [
    {
      icon: <PaletteIcon size={24} color="#2563eb" />,
      color: 'rgba(37,99,235,.12)',
      t: 'Visual Editor Canvas',
      d: 'Drag & drop posisi nama, tanggal, dan QR code langsung di atas template sertifikat.',
    },
    {
      icon: <ZapIcon size={24} color="#7c3aed" />,
      color: 'rgba(124,58,237,.12)',
      t: 'Proses Paralel Multi-thread',
      d: 'Memanfaatkan semua core CPU untuk memproses ratusan sertifikat per detik.',
    },
    {
      icon: <BarChartIcon size={24} color="#16a34a" />,
      color: 'rgba(22,163,74,.12)',
      t: 'Import CSV Mudah',
      d: 'Upload file CSV, petakan kolom ke variabel, dan preview hasilnya sebelum generate.',
    },
    {
      icon: <ShieldCheckIcon size={24} color="#d97706" />,
      color: 'rgba(217,119,6,.12)',
      t: 'Privasi 100%',
      d: 'Tidak ada data yang dikirim ke server. Semua proses di RAM browser Anda.',
    },
    {
      icon: <PackageIcon size={24} color="#dc2626" />,
      color: 'rgba(220,38,38,.12)',
      t: 'Ekspor ZIP / PDF',
      d: 'Paket semua sertifikat ke ZIP individual atau PDF multi-halaman tunggal.',
    },
    {
      icon: <GlobeIcon size={24} color="#0ea5e9" />,
      color: 'rgba(14,165,233,.12)',
      t: 'Bekerja Offline',
      d: 'Tidak perlu internet setelah halaman dimuat. Simpan template di browser.',
    },
  ];

  const steps = [
    {
      n: '1',
      icon: <FolderIcon size={24} color="var(--primary)" />,
      title: 'Upload Template',
      desc: 'Upload gambar template sertifikat Anda (PNG atau JPG). Template bisa dibuat di Canva, PowerPoint, atau aplikasi desain lainnya.',
      tip: 'Rekomendasi: ukuran A4 landscape (3508 × 2480 px) atau A4 portrait (2480 × 3508 px)',
      color: 'var(--primary)',
    },
    {
      n: '2',
      icon: <TargetIcon size={24} color="var(--purple)" />,
      title: 'Atur Posisi Elemen',
      desc: 'Di canvas editor, klik "Tambah Nama", "Tambah Tanggal", atau "Tambah QR Code". Drag elemen ke posisi yang tepat di atas template.',
      tip: 'Klik elemen untuk mengubah font, ukuran teks, dan warna di panel kanan.',
      color: 'var(--purple)',
    },
    {
      n: '3',
      icon: <BarChartIcon size={24} color="var(--green)" />,
      title: 'Import Data CSV',
      desc: 'Upload file CSV berisi daftar nama penerima. Petakan kolom CSV (misal: "Nama_Peserta") ke variabel template (misal: "{{nama}}").',
      tip: 'Tidak punya CSV? Gunakan tombol "Download Template CSV" untuk mendapatkan file contoh.',
      color: 'var(--green)',
    },
    {
      n: '4',
      icon: <ZapIcon size={24} color="var(--amber)" />,
      title: 'Generate & Download',
      desc: 'Pilih format ekspor (ZIP PNG, ZIP PDF, atau PDF tunggal), lalu klik "Mulai Generate". Semua sertifikat akan diproses dan dikemas otomatis.',
      tip: 'Sertifikat 500 orang biasanya selesai dalam < 30 detik.',
      color: 'var(--amber)',
    },
  ];

  return (
    <>
      <Head>
        <title>Pembuat Sertifikat Massal Otomatis Gratis | CertifyFlow</title>
        <meta name="description" content={description} />
        <meta name="robots" content="index, follow" />
        <meta name="theme-color" content="#2563eb" />
        <meta property="og:type" content="website" />
        <meta property="og:locale" content="id_ID" />
        <meta property="og:site_name" content="CertifyFlow" />
        <meta property="og:title" content="Pembuat Sertifikat Massal Otomatis Gratis | CertifyFlow" />
        <meta property="og:description" content={description} />
        {siteUrl && <link rel="canonical" href={siteUrl} />}
        {siteUrl && <meta property="og:url" content={siteUrl} />}
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content="Pembuat Sertifikat Massal Otomatis Gratis | CertifyFlow" />
        <meta name="twitter:description" content={description} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, '\\u003c') }}
        />
      </Head>

      <main className="hero">
        <div className="hero-badge" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <RocketIcon size={16} color="var(--primary)" />
          <span>Pembuat Sertifikat Otomatis Berbasis Browser</span>
        </div>

        <h1 className="hero-h1">
          Buat Ribuan Sertifikat<br />
          <span className="grad">Dalam Hitungan Detik</span>
        </h1>

        <p className="hero-p">
          Upload template PNG/JPG, import data CSV, dan ekspor ZIP berisi ratusan sertifikat personal
          — semua proses terjadi di browser Anda, tanpa server, 100% privasi.
        </p>

        <div className="hero-cta">
          <Link href="/wizard" className="btn btn-primary btn-lg" id="hero-mulai-btn" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <SparklesIcon size={18} />
            Mulai Buat Sertifikat
          </Link>
          <Link href="#cara-pakai" className="btn btn-secondary btn-lg" id="hero-cara-btn" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <BookOpenIcon size={18} />
            Cara Penggunaan
          </Link>
        </div>

        {/* Stats */}
        <div className="stats-row">
          {[
            { v: '10.000+', l: 'Sertifikat per Batch' },
            { v: '100%', l: 'Client-Side' },
            { v: 'Rp 0', l: 'Biaya Server' },
            { v: '< 5 detik', l: 'Waktu Generate' },
          ].map(s => (
            <div className="stat-item" key={s.l}>
              <div className="stat-v">{s.v}</div>
              <div className="stat-l">{s.l}</div>
            </div>
          ))}
        </div>

        {/* Feature grid */}
        <div className="features">
          {features.map(f => (
            <div className="feat" key={f.t}>
              <div className="feat-ico" style={{ background: f.color }}>{f.icon}</div>
              <div className="feat-t">{f.t}</div>
              <div className="feat-d">{f.d}</div>
            </div>
          ))}
        </div>
      </main>

      {/* HOW TO USE SECTION */}
      <section id="cara-pakai" style={{ padding: '80px 24px', background: 'var(--elevated)' }}>
        <div style={{ maxWidth: '860px', margin: '0 auto' }}>
          <h2 style={{ fontSize: '28px', fontWeight: 900, textAlign: 'center', letterSpacing: '-0.03em', marginBottom: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
            <BookOpenIcon size={28} color="var(--primary)" />
            Cara Penggunaan
          </h2>
          <p style={{ textAlign: 'center', color: 'var(--text-2)', fontSize: '15px', marginBottom: '56px' }}>
            Ikuti 4 langkah mudah ini untuk membuat sertifikat massal
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {steps.map((s, i) => (
              <div key={i} style={{
                background: 'var(--surface)', border: '1px solid var(--border)',
                borderRadius: 'var(--r-xl)', padding: '24px 28px',
                display: 'grid', gridTemplateColumns: '48px 1fr', gap: '20px', alignItems: 'start',
              }}>
                <div style={{
                  width: 48, height: 48, borderRadius: '50%', flexShrink: 0,
                  background: `${s.color}20`, border: `2px solid ${s.color}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {s.icon}
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                    <span style={{ fontSize: '10px', fontWeight: 700, color: s.color, letterSpacing: '0.1em' }}>LANGKAH {s.n}</span>
                  </div>
                  <div style={{ fontSize: '17px', fontWeight: 800, marginBottom: '8px', color: 'var(--text)' }}>{s.title}</div>
                  <div style={{ fontSize: '14px', color: 'var(--text-2)', lineHeight: 1.6, marginBottom: '10px' }}>{s.desc}</div>
                  <div style={{ fontSize: '13px', color: 'var(--text-2)', background: 'var(--elevated)', padding: '10px 14px', borderRadius: '8px', lineHeight: 1.5, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <LightbulbIcon size={16} color="var(--amber)" style={{ flexShrink: 0 }} />
                    <span>{s.tip}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div style={{ textAlign: 'center', marginTop: '40px' }}>
            <Link href="/wizard" className="btn btn-primary btn-lg" id="howto-cta-btn" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <SparklesIcon size={18} />
              Coba Sekarang — Gratis!
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
