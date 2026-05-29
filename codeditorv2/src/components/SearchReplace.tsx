import { useState, useCallback, useEffect, useRef } from 'react';

interface Props {
  content: string;
  onClose: () => void;
  onApply: (newContent: string) => void;
}

interface Match {
  index: number;
  length: number;
}

export default function SearchReplace({ content, onClose, onApply }: Props) {
  const [searchText, setSearchText] = useState('');
  const [replaceText, setReplaceText] = useState('');
  const [useRegex, setUseRegex] = useState(false);
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [matchCount, setMatchCount] = useState(0);
  const [currentMatch, setCurrentMatch] = useState(0);
  const [matches, setMatches] = useState<Match[]>([]);
  const [replaced, setReplaced] = useState(false);

  const searchRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    searchRef.current?.focus();
  }, []);

  // Find matches
  useEffect(() => {
    if (!searchText) {
      setMatches([]);
      setMatchCount(0);
      setCurrentMatch(0);
      return;
    }
    try {
      const flags = caseSensitive ? 'g' : 'gi';
      const pattern = useRegex ? searchText : searchText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(pattern, flags);
      const found: Match[] = [];
      let match;
      while ((match = regex.exec(content)) !== null) {
        found.push({ index: match.index, length: match[0].length });
        if (match[0].length === 0) regex.lastIndex++;
        if (found.length > 50000) break;
      }
      setMatches(found);
      setMatchCount(found.length);
      setCurrentMatch(found.length > 0 ? 1 : 0);
    } catch {
      setMatches([]);
      setMatchCount(0);
      setCurrentMatch(0);
    }
  }, [searchText, content, useRegex, caseSensitive]);

  const handleReplaceAll = useCallback(() => {
    if (!searchText || matchCount === 0) return;
    try {
      const flags = caseSensitive ? 'g' : 'gi';
      const pattern = useRegex ? searchText : searchText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(pattern, flags);
      const newContent = content.replace(regex, replaceText);
      onApply(newContent);
      setReplaced(true);
      setTimeout(() => setReplaced(false), 2000);
    } catch {
      // ignore regex errors
    }
  }, [searchText, replaceText, content, useRegex, caseSensitive, matchCount, onApply]);

  const handleReplaceOne = useCallback(() => {
    if (!searchText || matchCount === 0 || currentMatch === 0) return;
    const m = matches[currentMatch - 1];
    const newContent = content.substring(0, m.index) + replaceText + content.substring(m.index + m.length);
    onApply(newContent);
    setReplaced(true);
    setTimeout(() => setReplaced(false), 2000);
  }, [searchText, replaceText, content, matches, currentMatch, matchCount, onApply]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'Enter' && e.ctrlKey) handleReplaceAll();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, handleReplaceAll]);

  // Get context snippet for current match
  const getContext = () => {
    if (currentMatch === 0 || matches.length === 0) return '';
    const m = matches[currentMatch - 1];
    const start = Math.max(0, m.index - 40);
    const end = Math.min(content.length, m.index + m.length + 40);
    const before = content.substring(start, m.index);
    const matched = content.substring(m.index, m.index + m.length);
    const after = content.substring(m.index + m.length, end);
    return { before, matched, after };
  };

  const ctx = getContext();

  return (
    <div className="fixed inset-0 bg-black/60 flex items-start justify-center pt-14 z-50 animate-fadeIn" onClick={onClose}>
      <div
        className="bg-[#1e293b] rounded-xl shadow-2xl border border-[#334155] w-[720px] max-w-[95vw] overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-[#334155]">
          <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
            <span className="text-sky-400">🔍</span> Buscar y Reemplazar Bloques
          </h3>
          <div className="flex items-center gap-3">
            {replaced && (
              <span className="text-[10px] text-emerald-400 bg-emerald-900/30 px-2 py-0.5 rounded animate-fadeIn">
                ✓ Reemplazo aplicado
              </span>
            )}
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-200 text-lg leading-none w-6 h-6 flex items-center justify-center rounded hover:bg-[#334155]"
            >
              ×
            </button>
          </div>
        </div>

        <div className="p-5 space-y-4">
          {/* Search textarea */}
          <div>
            <label className="text-[11px] text-slate-400 mb-1.5 block font-medium uppercase tracking-wide">
              Buscar — pegar bloques completos sin límite
            </label>
            <textarea
              ref={searchRef}
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
              className="w-full h-28 bg-[#0f172a] border border-[#334155] rounded-lg px-3 py-2 text-[13px] text-slate-200 font-mono resize-y focus:outline-none focus:border-sky-500/60 focus:ring-1 focus:ring-sky-500/20 transition-colors placeholder:text-slate-600"
              placeholder="Texto a buscar, expresión regular, o bloque completo de código..."
              spellCheck={false}
            />
          </div>

          {/* Replace textarea */}
          <div>
            <label className="text-[11px] text-slate-400 mb-1.5 block font-medium uppercase tracking-wide">
              Reemplazar con
            </label>
            <textarea
              value={replaceText}
              onChange={e => setReplaceText(e.target.value)}
              className="w-full h-20 bg-[#0f172a] border border-[#334155] rounded-lg px-3 py-2 text-[13px] text-slate-200 font-mono resize-y focus:outline-none focus:border-sky-500/60 focus:ring-1 focus:ring-sky-500/20 transition-colors placeholder:text-slate-600"
              placeholder="Texto de reemplazo (usar $1, $2 para grupos de captura)..."
              spellCheck={false}
            />
          </div>

          {/* Context preview */}
          {ctx && (
            <div className="bg-[#0f172a] rounded-lg border border-[#334155] px-3 py-2 text-[11px] font-mono overflow-hidden">
              <span className="text-slate-600">...</span>
              <span className="text-slate-400">{ctx.before}</span>
              <span className="bg-sky-500/30 text-sky-300 px-0.5 rounded">{ctx.matched}</span>
              <span className="text-slate-400">{ctx.after}</span>
              <span className="text-slate-600">...</span>
            </div>
          )}

          {/* Options row */}
          <div className="flex items-center gap-5 flex-wrap">
            <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer select-none group">
              <input
                type="checkbox"
                checked={useRegex}
                onChange={e => setUseRegex(e.target.checked)}
                className="accent-sky-500 w-3.5 h-3.5"
              />
              <span className="group-hover:text-slate-300 transition-colors">.* Expresión Regular</span>
            </label>
            <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer select-none group">
              <input
                type="checkbox"
                checked={caseSensitive}
                onChange={e => setCaseSensitive(e.target.checked)}
                className="accent-sky-500 w-3.5 h-3.5"
              />
              <span className="group-hover:text-slate-300 transition-colors">Aa Sensible a mayúsculas</span>
            </label>
            <div className="flex-1" />
            <span className="text-xs tabular-nums">
              {matchCount > 0 ? (
                <span className="text-sky-400 font-medium">
                  {currentMatch} de {matchCount} coincidencias
                </span>
              ) : searchText ? (
                <span className="text-slate-500">Sin coincidencias</span>
              ) : (
                <span className="text-slate-600">Escribe para buscar</span>
              )}
            </span>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={() => setCurrentMatch(prev => prev > 1 ? prev - 1 : matchCount)}
              disabled={matchCount === 0}
              className="px-3.5 py-2 text-xs bg-[#334155] hover:bg-[#475569] disabled:opacity-30 disabled:hover:bg-[#334155] rounded-lg text-slate-200 transition-colors"
            >
              ↑ Anterior
            </button>
            <button
              onClick={() => setCurrentMatch(prev => prev < matchCount ? prev + 1 : 1)}
              disabled={matchCount === 0}
              className="px-3.5 py-2 text-xs bg-[#334155] hover:bg-[#475569] disabled:opacity-30 disabled:hover:bg-[#334155] rounded-lg text-slate-200 transition-colors"
            >
              ↓ Siguiente
            </button>
            <div className="flex-1" />
            <button
              onClick={handleReplaceOne}
              disabled={matchCount === 0}
              className="px-4 py-2 text-xs bg-amber-600/80 hover:bg-amber-600 disabled:opacity-30 disabled:hover:bg-amber-600/80 rounded-lg text-white font-medium transition-colors"
            >
              Reemplazar Uno
            </button>
            <button
              onClick={handleReplaceAll}
              disabled={matchCount === 0}
              className="px-4 py-2 text-xs bg-sky-600 hover:bg-sky-500 disabled:opacity-30 disabled:hover:bg-sky-600 rounded-lg text-white font-medium transition-colors"
            >
              Reemplazar Todo{matchCount > 0 ? ` (${matchCount})` : ''}
            </button>
          </div>
        </div>

        {/* Footer hint */}
        <div className="px-5 py-2.5 border-t border-[#334155] bg-[#162032]">
          <p className="text-[10px] text-slate-500">
            <kbd className="px-1 py-0.5 bg-[#0f172a] rounded text-[9px] text-slate-400 border border-[#334155]">Ctrl+Enter</kbd> Reemplazar todo
            <span className="mx-2">·</span>
            <kbd className="px-1 py-0.5 bg-[#0f172a] rounded text-[9px] text-slate-400 border border-[#334155]">Esc</kbd> Cerrar
          </p>
        </div>
      </div>
    </div>
  );
}
