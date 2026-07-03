import { useState } from 'react';

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
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-left text-xs font-bold mt-0.5 transition-colors"
          style={{ color: '#2DD4BF', fontFamily: 'Montserrat, sans-serif' }}
        >
          {expanded ? 'Свернуть' : `Показать ещё (${hiddenCount})`}
        </button>
      )}
    </div>
  );
}
