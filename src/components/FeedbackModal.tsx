import { useState, useRef, useEffect } from 'react';
import { t } from '../i18n';

const BASE = import.meta.env.VITE_API_URL ?? '';
const SANS = { fontFamily: 'Montserrat, sans-serif' };

type Status = 'idle' | 'loading' | 'success' | 'error';

interface Props {
  onClose: () => void;
}

export default function FeedbackModal({ onClose }: Props) {
  const [message, setMessage] = useState('');
  const [contact, setContact] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || status === 'loading') return;

    setStatus('loading');
    try {
      const res = await fetch(`${BASE}/api/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: message.trim(), contact: contact.trim() || undefined }),
      });
      if (!res.ok) throw new Error();
      setStatus('success');
    } catch {
      setStatus('error');
    }
  };

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      style={{ background: 'rgba(0,0,0,.82)', backdropFilter: 'blur(6px)' }}
    >
      <div
        className="w-full sm:max-w-[440px] sm:rounded-[24px] rounded-t-[24px] flex flex-col gap-5 p-6"
        style={{
          background: 'rgba(14,15,18,.98)',
          border: '1px solid rgba(255,255,255,.08)',
          boxShadow: '0 32px 80px rgba(0,0,0,.8)',
          ...SANS,
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <span className="text-white font-extrabold text-[15px] tracking-[-0.02em]">
            {t.feedback_title}
          </span>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-full transition-colors hover:bg-white/10"
            style={{ color: 'rgba(255,255,255,.4)' }}
            aria-label={t.close}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {status === 'success' ? (
          <div className="py-8 flex flex-col items-center gap-3">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(45,212,191,.12)', border: '1px solid rgba(45,212,191,.25)' }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M5 12l5 5L19 7" stroke="#2DD4BF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <p className="text-white/70 text-[13px] text-center font-medium">
              {t.feedback_success}
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder={t.feedback_placeholder}
              rows={4}
              maxLength={2000}
              disabled={status === 'loading'}
              autoFocus
              className="w-full resize-none rounded-[14px] px-4 py-3 text-white text-[14px] font-medium placeholder-[#8a8a8a] focus:outline-none focus:ring-1 focus:ring-[#2DD4BF] focus:border-[#2DD4BF] transition disabled:opacity-50"
              style={{
                background: 'rgba(255,255,255,.07)',
                border: '1px solid rgba(255,255,255,.1)',
                ...SANS,
              }}
            />
            <input
              type="text"
              value={contact}
              onChange={e => setContact(e.target.value)}
              placeholder={t.feedback_contact_placeholder}
              maxLength={200}
              disabled={status === 'loading'}
              className="w-full rounded-[14px] px-4 py-3 text-white text-[14px] font-medium placeholder-[#8a8a8a] focus:outline-none focus:ring-1 focus:ring-[#2DD4BF] focus:border-[#2DD4BF] transition disabled:opacity-50"
              style={{
                background: 'rgba(255,255,255,.07)',
                border: '1px solid rgba(255,255,255,.1)',
                ...SANS,
              }}
            />

            {status === 'error' && (
              <p className="text-red-400 text-[12px] font-medium px-1">
                {t.feedback_error}
              </p>
            )}

            <button
              type="submit"
              disabled={!message.trim() || status === 'loading'}
              className="w-full h-11 rounded-full text-[#06231f] font-extrabold text-[13px] uppercase tracking-[0.08em] disabled:opacity-40 transition-opacity"
              style={{
                background: '#2DD4BF',
                boxShadow: message.trim() ? '0 0 20px rgba(45,212,191,.35)' : 'none',
                ...SANS,
              }}
            >
              {status === 'loading' ? t.feedback_sending : t.feedback_send}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
