import type { AppProps } from 'next/app';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import '@/styles/globals.css';
import { AwardIcon, HomeIcon, SparklesIcon, FolderIcon, SunIcon, MoonIcon } from '@/components/Icons';

function TopNav() {
  const router = useRouter();
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('cf-theme');
    if (saved === 'dark') { document.documentElement.setAttribute('data-theme', 'dark'); setDark(true); }
  }, []);

  const toggle = () => {
    const n = !dark; setDark(n);
    document.documentElement.setAttribute('data-theme', n ? 'dark' : '');
    localStorage.setItem('cf-theme', n ? 'dark' : 'light');
  };

  const links = [
    { href: '/', label: 'Beranda', icon: <HomeIcon size={15} style={{ marginRight: 6 }} /> },
    { href: '/wizard', label: 'Buat Sertifikat', icon: <SparklesIcon size={15} style={{ marginRight: 6 }} /> },
    { href: '/storage', label: 'Library', icon: <FolderIcon size={15} style={{ marginRight: 6 }} /> },
  ];

  return (
    <nav className="topnav">
      <Link href="/" className="topnav-logo">
        <div className="topnav-logo-icon">
          <AwardIcon size={19} color="#ffffff" strokeWidth={2.2} />
        </div>
        <span className="topnav-logo-name">CertifyFlow</span>
        <span className="topnav-logo-badge">ENTERPRISE</span>
      </Link>
      <div className="topnav-spacer" />
      {links.map(l => (
        <Link key={l.href} href={l.href}
          className={`topnav-btn ${router.pathname === l.href || (l.href === '/wizard' && router.pathname.startsWith('/wizard')) ? 'active' : ''}`}
          style={{ display: 'inline-flex', alignItems: 'center' }}>
          {l.icon}
          {l.label}
        </Link>
      ))}
      <button className="theme-btn" onClick={toggle} id="theme-toggle" title="Ganti tema" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {dark ? <SunIcon size={17} /> : <MoonIcon size={17} />}
      </button>
      <Link href="/wizard" className="btn btn-primary btn-sm" id="nav-buat-btn" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
        <SparklesIcon size={14} />
        Buat Sekarang
      </Link>
    </nav>
  );
}

export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <TopNav />
      <Component {...pageProps} />
    </>
  );
}
