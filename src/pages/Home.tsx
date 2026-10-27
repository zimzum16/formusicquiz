import { useState, type ReactNode } from 'react';
import { Page } from '../App';
import { t } from '../i18n';
import { LogoIcon } from '../components/LogoIcon';
import { useIsMobile } from '../hooks/useMediaQuery';

interface HomeProps {
  navigate: (page: Page) => void;
}

const SearchIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
    <circle cx="10" cy="10" r="6" stroke="#2DD4BF" strokeWidth="1.8"/>
    <path d="M15 15l4 4" stroke="#2DD4BF" strokeWidth="1.8" strokeLinecap="round"/>
    <path d="M10 7v3l2 1" stroke="#2DD4BF" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

interface FeatureCardProps {
  label: string;
  icon: ReactNode;
  title: string;          // \n — перенос строки
  desc: string;
  preview: { src: string; alt: string };
  isMobile: boolean;
  titleOffset?: number;   // marginTop заголовка; в вёрстке он был только у slicer
  onOpen: () => void;
  onZoom: (src: string) => void;
}

const FeatureCard = ({ label, icon, title, desc, preview, isMobile, titleOffset, onOpen, onZoom }: FeatureCardProps) => (
  <div
    onClick={onOpen}
    style={{
      background: 'rgba(14,15,18,.95)',
      border: '1px solid rgba(255,255,255,.07)',
      borderRadius: 24, overflow: 'hidden',
      display: 'flex', flexDirection: 'column',
      cursor: 'pointer', transition: 'border-color .2s',
    }}
    onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(45,212,191,.25)')}
    onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,.07)')}
  >
    <div style={{ padding: '32px 32px 24px', textAlign: 'center' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 12 }}>
        <div style={{
          width: 28, height: 28, borderRadius: 8,
          background: 'rgba(45,212,191,.12)',
          border: '1px solid rgba(45,212,191,.2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          overflow: 'hidden',
        }}>
          {icon}
        </div>
        <span style={{
          fontFamily: 'Montserrat, sans-serif',
          fontSize: 13, fontWeight: 700,
          letterSpacing: '.16em', textTransform: 'uppercase',
          color: '#2DD4BF',
        }}>{label}</span>
      </div>
      <h2 style={{ fontSize: 18, fontWeight: 900, letterSpacing: '-.03em', color: '#aaa', marginBottom: isMobile ? 0 : 8, lineHeight: 1.2, marginTop: titleOffset }}>
        {title.split('\n').map((line, i, arr) => (
          <span key={i}>{line}{i < arr.length - 1 && <br />}</span>
        ))}
      </h2>
      {!isMobile && (
        <p style={{ fontSize: 13, color: '#999', fontWeight: 500, lineHeight: 1.6 }}>
          {desc}
        </p>
      )}
    </div>
    <div style={{ padding: '0 20px 20px', flex: 1 }}>
      <img
        src={preview.src}
        alt={preview.alt}
        onClick={e => { e.stopPropagation(); onZoom(preview.src); }}
        style={{ width: '100%', borderRadius: 14, display: 'block', cursor: 'zoom-in' }}
      />
    </div>
  </div>
);

export default function Home({ navigate }: HomeProps) {
  const [lightbox, setLightbox] = useState<string | null>(null);
  const isMobile = useIsMobile();

  return (
    <>
    <main style={{ fontFamily: 'Montserrat, sans-serif', color: '#fff' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: isMobile ? '40px 16px 60px' : '80px 32px 120px' }}>

        {/* Wordmark */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, marginBottom: 96 }}>
          <div style={{
            width: 72, height: 72, borderRadius: 18,
            background: '#0c0d10',
            border: '1px solid rgba(255,255,255,.09)',
            boxShadow: '0 0 0 1px rgba(45,212,191,.14), 0 20px 60px rgba(0,0,0,.8), inset 0 1px 0 rgba(255,255,255,.06)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            position: 'relative', overflow: 'hidden',
          }}>
            <div style={{
              position: 'absolute', width: 70, height: 28,
              background: 'rgba(45,212,191,.09)',
              filter: 'blur(18px)', borderRadius: '50%',
            }} />
            <LogoIcon variant="hero" />
          </div>

          <div style={{ fontSize: isMobile ? 34 : 46, fontWeight: 900, letterSpacing: '-.05em', lineHeight: 1 }}>
            track<span style={{ color: '#2DD4BF' }}>slice</span>
          </div>

          <div style={{
            fontFamily: 'Montserrat, sans-serif',
            fontSize: 11, color: '#888',
            letterSpacing: '.2em', textTransform: 'uppercase',
          }}>
            discover · cut · download
          </div>
        </div>

        {/* Two cards */}
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: isMobile ? 16 : 20 }}>

          <FeatureCard
            label="track"
            icon={<SearchIcon />}
            title={t.home_track_title}
            desc={t.home_track_desc}
            preview={{ src: '/preview-song-info.png', alt: 'track' }}
            isMobile={isMobile}
            onOpen={() => navigate('song-info')}
            onZoom={setLightbox}
          />
          <FeatureCard
            label="slicer"
            icon={<LogoIcon variant="card" />}
            title={t.home_slicer_title}
            desc={t.home_slicer_desc}
            preview={{ src: '/preview-editor.png', alt: 'slicer' }}
            isMobile={isMobile}
            titleOffset={8}
            onOpen={() => navigate('editor')}
            onZoom={setLightbox}
          />

        </div>
      </div>
    </main>

    {lightbox && (
      <div
        onClick={() => setLightbox(null)}
        style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          background: 'rgba(0,0,0,.85)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'zoom-out', padding: 32,
        }}
      >
        <img
          src={lightbox}
          alt=""
          style={{ maxWidth: '100%', maxHeight: '100%', borderRadius: 16, boxShadow: '0 32px 80px rgba(0,0,0,.8)' }}
        />
      </div>
    )}
    </>
  );
}
