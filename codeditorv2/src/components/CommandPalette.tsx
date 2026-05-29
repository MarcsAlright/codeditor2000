import { useState, useEffect, useRef } from 'react';

export interface Command {
  id: string;
  label: string;
  shortcut?: string;
  icon?: string;
  category?: string;
  action: () => void;
}

interface Props {
  commands: Command[];
  onClose: () => void;
}

export default function CommandPalette({ commands, onClose }: Props) {
  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const filtered = commands.filter(cmd =>
    cmd.label.toLowerCase().includes(search.toLowerCase()) ||
    (cmd.category && cmd.category.toLowerCase().includes(search.toLowerCase()))
  );

  useEffect(() => {
    setSelectedIndex(0);
  }, [search]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, filtered.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter' && filtered[selectedIndex]) {
        e.preventDefault();
        filtered[selectedIndex].action();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [filtered, selectedIndex, onClose]);

  // Scroll selected item into view
  useEffect(() => {
    if (listRef.current) {
      const selected = listRef.current.children[selectedIndex] as HTMLElement;
      selected?.scrollIntoView?.({ block: 'nearest' });
    }
  }, [selectedIndex]);

  return (
    <div className="fixed inset-0 bg-black/60 flex items-start justify-center pt-14 z-50 animate-fadeIn" onClick={onClose}>
      <div
        className="bg-[#1e293b] rounded-xl shadow-2xl border border-[#334155] w-[560px] max-w-[95vw] overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="p-3 border-b border-[#334155]">
          <div className="flex items-center gap-2 bg-[#0f172a] border border-[#334155] rounded-lg px-3 py-2">
            <span className="text-slate-500 text-sm">⌘</span>
            <input
              ref={inputRef}
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="flex-1 bg-transparent text-sm text-slate-200 focus:outline-none placeholder:text-slate-600"
              placeholder="Escribe un comando..."
            />
          </div>
        </div>

        {/* Command list */}
        <div ref={listRef} className="max-h-72 overflow-y-auto py-1">
          {filtered.length === 0 ? (
            <div className="px-4 py-6 text-center">
              <p className="text-sm text-slate-500">No se encontraron comandos</p>
              <p className="text-[11px] text-slate-600 mt-1">Intenta con otro término</p>
            </div>
          ) : (
            filtered.map((cmd, i) => (
              <button
                key={cmd.id}
                onClick={() => { cmd.action(); onClose(); }}
                onMouseEnter={() => setSelectedIndex(i)}
                className={`w-full px-4 py-2.5 flex items-center justify-between text-sm transition-colors ${
                  i === selectedIndex
                    ? 'bg-sky-500/15 text-sky-300'
                    : 'text-slate-300 hover:bg-[#334155]/60'
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <span className="text-xs opacity-60 w-4 text-center">{cmd.icon || '›'}</span>
                  <span>{cmd.label}</span>
                  {cmd.category && (
                    <span className="text-[9px] text-slate-600 bg-[#0f172a] px-1.5 py-0.5 rounded">
                      {cmd.category}
                    </span>
                  )}
                </span>
                {cmd.shortcut && (
                  <kbd className="text-[10px] text-slate-500 bg-[#0f172a] px-1.5 py-0.5 rounded border border-[#334155]">
                    {cmd.shortcut}
                  </kbd>
                )}
              </button>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-[#334155] bg-[#162032] flex items-center gap-4">
          <span className="text-[10px] text-slate-500">
            <kbd className="px-1 py-0.5 bg-[#0f172a] rounded text-[9px] text-slate-400 border border-[#334155]">↑↓</kbd> Navegar
          </span>
          <span className="text-[10px] text-slate-500">
            <kbd className="px-1 py-0.5 bg-[#0f172a] rounded text-[9px] text-slate-400 border border-[#334155]">Enter</kbd> Ejecutar
          </span>
          <span className="text-[10px] text-slate-500">
            <kbd className="px-1 py-0.5 bg-[#0f172a] rounded text-[9px] text-slate-400 border border-[#334155]">Esc</kbd> Cerrar
          </span>
        </div>
      </div>
    </div>
  );
}
