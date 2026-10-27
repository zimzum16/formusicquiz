// Мелкие презентационные блоки страницы трека
import { t } from '../../i18n';
import { useIsMobile } from '../../hooks/useMediaQuery';
import { flagEmojiToIso } from '../../lib/geniusCountries';
import { SANS, LBL, VAL } from './styles';

export const FlagImg = ({ emoji }: { emoji: string }) => (
  <img
    src={`https://flagcdn.com/16x12/${flagEmojiToIso(emoji)}.png`}
    width={16} height={12}
    style={{ display: 'inline', verticalAlign: 'middle', marginRight: 3 }}
  />
);

export function MetaRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-6 px-4 py-[11px] border-b border-white/[0.08] last:border-0 bg-white/[0.02]">
      <span className={`${LBL} shrink-0 pt-[1px]`} style={SANS}>{label}</span>
      <span className={`${VAL} text-right`} style={SANS}>{value}</span>
    </div>
  );
}

export function MetaCompact({ items }: { items: { label: string; value: React.ReactNode }[] }) {
  const mobile = useIsMobile();
  return (
    <div
      className="border-b border-white/[0.08] last:border-0 bg-white/[0.02]"
      style={mobile
        ? { display: 'grid', gridTemplateColumns: '1fr 1fr' }
        : { display: 'flex' }
      }
    >
      {items.map((item, i) => {
        const isRightCol = mobile && i % 2 === 1;
        const isSecondRow = mobile && i >= 2;
        const borderLeft = isRightCol || (!mobile && i > 0);
        const borderTop = isSecondRow;
        return (
          <div
            key={i}
            className="flex flex-col items-center gap-0.5 px-3 py-[10px]"
            style={{
              flex: mobile ? undefined : 1,
              borderLeft: borderLeft ? '1px solid rgba(255,255,255,0.08)' : undefined,
              borderTop: borderTop ? '1px solid rgba(255,255,255,0.08)' : undefined,
            }}
          >
            <span className={LBL} style={SANS}>{item.label}</span>
            <span className={`${VAL} text-[13px]`} style={SANS}>{item.value}</span>
          </div>
        );
      })}
    </div>
  );
}

export function GeniusLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="text-[12px] font-semibold transition-opacity hover:opacity-80 flex items-center gap-1"
      style={{ color: '#2DD4BF', ...SANS }}
    >
      ▸ {children}
    </a>
  );
}

export function StripCard({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="flex flex-col sm:flex-row sm:items-center sm:flex-wrap gap-3 px-5 py-3.5 rounded-[14px] border border-white/[0.1]"
      style={{ background: 'rgba(24,24,28,.78)', backdropFilter: 'saturate(180%) blur(24px)' }}
    >
      {children}
    </div>
  );
}

export function ExternalLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="text-[11px] font-bold transition-opacity hover:opacity-80"
      style={{ color: '#2DD4BF', ...SANS }}
    >
      {children}
    </a>
  );
}

export function ServiceLogo({ icon, name, link, linkLabel }: { icon: React.ReactNode; name: string; link?: string; linkLabel?: string }) {
  return (
    <div className="w-full sm:flex-shrink-0 sm:w-[140px] flex items-center gap-2.5 border-b sm:border-b-0 sm:border-r border-white/[0.08] pb-2 sm:pb-0 sm:pr-4 sm:mr-2">
      {icon}
      <div>
        <div className="text-[12px] font-bold text-white" style={SANS}>{name}</div>
        {link && (
          <ExternalLink href={link}>{linkLabel ?? t.link_open}</ExternalLink>
        )}
      </div>
    </div>
  );
}

export function StatCol({ label, value, last }: { label: string; value: React.ReactNode; last?: boolean }) {
  return (
    <div className={`px-4 ${last ? '' : 'border-r border-white/[0.08]'}`}>
      <div className={LBL} style={SANS}>{label}</div>
      <div className={`${VAL} mt-0.5`} style={SANS}>{value}</div>
    </div>
  );
}
