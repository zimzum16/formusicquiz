import { useState } from 'react';
import { t } from '../i18n';

interface CollapsibleListProps<T> {
  items: T[];
  limit?: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  emptyLabel?: string;
}

export function CollapsibleList<T>({ items, limit = 3, renderItem, emptyLabel }: CollapsibleListProps<T>) {
  const [expanded, setExpanded] = useState(false);

  if (!items.length) {
    return emptyLabel ? <span className="text-[#8a8a8a] text-xs">{emptyLabel}</span> : null;
  }

  const visible = expanded ? items : items.slice(0, limit);
  const hiddenCount = items.length - limit;

  return (
    <div className="flex flex-col gap-1.5">
      {visible.map((item, i) => renderItem(item, i))}
      {hiddenCount > 0 && (
        <ShowMoreButton expanded={expanded} hidden={hiddenCount} onToggle={() => setExpanded(!expanded)} />
      )}
    </div>
  );
}

// Общая кнопка «+ Показать ещё (N)» / «↑ Свернуть» для всех раскрывающихся списков
export function ShowMoreButton({ expanded, hidden, onToggle }: { expanded: boolean; hidden: number; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className="self-start text-left text-[11px] font-semibold mt-1.5 transition-colors hover:text-white"
      style={{ color: '#8a8a8a', fontFamily: 'Montserrat, sans-serif' }}
    >
      {expanded ? `↑ ${t.collapse}` : `+ ${t.show_more} (${hidden})`}
    </button>
  );
}
