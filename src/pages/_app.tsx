import type { AppProps } from 'next/app';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import '@/styles/globals.css';

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
    { href: '/', label: '🏠 Beranda' },
    { href: '/wizard', label: '✨ Buat Sertifikat' },
    { href: '/storage', label: '🗂️ Library' },
  ];

  return (
    <nav className="topnav">
      <Link href="/" className="topnav-logo">
        <div className="topnav-logo-icon">🏆</div>
        <span className="topnav-logo-name">CertifyFlow</span>
        <span className="topnav-logo-badge">ENTERPRISE</span>
      </Link>
      <div className="topnav-spacer" />
      {links.map(l => (
        <Link key={l.href} href={l.href}
          className={`topnav-btn ${router.pathname === l.href || (l.href === '/wizard' && router.pathname.startsWith('/wizard')) ? 'active' : ''}`}>
          {l.label}
        </Link>
      ))}
      <button className="theme-btn" onClick={toggle} id="theme-toggle" title="Ganti tema">
        {dark ? '☀️' : '🌙'}
      </button>
      <Link href="/wizard" className="btn btn-primary btn-sm" id="nav-buat-btn">✨ Buat Sekarang</Link>
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
