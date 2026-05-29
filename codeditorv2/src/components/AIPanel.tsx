import { useState, useCallback, useRef, useEffect } from 'react';
import { diffLines, Change } from 'diff';

interface Props {
  apiKey: string;
  onApiKeyChange: (key: string) => void;
  currentContent: string;
  onApplyChanges: (newContent: string) => void;
  onClose: () => void;
}

type AIMode = 'explain' | 'generate' | 'refactor';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export default function AIPanel({
  apiKey,
  onApiKeyChange,
  currentContent,
  onApplyChanges,
  onClose,
}: Props) {
  const [mode, setMode] = useState<AIMode>('generate');
  const [prompt, setPrompt] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showDiff, setShowDiff] = useState(false);
  const [generatedCode, setGeneratedCode] = useState('');
  const [showApiKey, setShowApiKey] = useState(!apiKey);
  const [diffs, setDiffs] = useState<Change[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, error]);

  const systemPrompts: Record<AIMode, string> = {
    explain:
      'Eres un asistente experto en desarrollo web (HTML, CSS, JavaScript). Explica de forma clara y concisa en español el código proporcionado. Usa formato legible con bullets y secciones.',
    generate:
      'Eres un asistente experto en desarrollo web. Genera código HTML/CSS/JS completo y funcional según la descripción del usuario. Retorna SOLO el código sin explicaciones, sin markdown, sin fences de código.',
    refactor:
      'Eres un asistente experto en desarrollo web. Refactoriza o mejora el código HTML/CSS/JS proporcionado. Retorna SOLO el código completo refactorizado sin explicaciones, sin markdown, sin fences de código.',
  };

  const sendPrompt = useCallback(async () => {
    if (!apiKey || !prompt.trim()) return;
    setLoading(true);
    setError('');
    setShowDiff(false);
    setGeneratedCode('');

    const userMsg: ChatMessage = { role: 'user', content: prompt };
    setMessages(prev => [...prev, userMsg]);
    setPrompt('');

    const contextContent =
      mode === 'generate'
        ? prompt
        : `${prompt}\n\n--- CÓDIGO ACTUAL ---\n${currentContent.substring(0, 8000)}`;

    try {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            { role: 'system', content: systemPrompts[mode] },
            { role: 'user', content: contextContent },
          ],
          temperature: 0.3,
          max_tokens: 4096,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error?.message || `Error HTTP ${res.status}`);
      }

      const data = await res.json();
      const content = data.choices?.[0]?.message?.content || '';
      const assistantMsg: ChatMessage = { role: 'assistant', content };
      setMessages(prev => [...prev, assistantMsg]);

      if (mode !== 'explain') {
        setGeneratedCode(content);
      }
    } catch (err: any) {
      setError(err.message || 'Error de conexión con Groq API');
    } finally {
      setLoading(false);
    }
  }, [apiKey, prompt, mode, currentContent]);

  const handleReviewChanges = useCallback(() => {
    if (!generatedCode) return;
    const cleanCode = generatedCode
      .replace(/^```(?:html|css|js|javascript)?\s*\n?/i, '')
      .replace(/\n?```\s*$/i, '')
      .trim();
    const changes = diffLines(currentContent, cleanCode);
    setDiffs(changes);
    setShowDiff(true);
  }, [generatedCode, currentContent]);

  const confirmApply = useCallback(() => {
    const cleanCode = generatedCode
      .replace(/^```(?:html|css|js|javascript)?\s*\n?/i, '')
      .replace(/\n?```\s*$/i, '')
      .trim();
    onApplyChanges(cleanCode);
    setShowDiff(false);
    setGeneratedCode('');
    setMessages(prev => [
      ...prev,
      { role: 'assistant', content: '✅ Cambios aplicados correctamente al editor.' },
    ]);
  }, [generatedCode, onApplyChanges]);

  const rejectChanges = useCallback(() => {
    setShowDiff(false);
    setGeneratedCode('');
  }, []);

  const clearChat = useCallback(() => {
    setMessages([]);
    setError('');
    setShowDiff(false);
    setGeneratedCode('');
  }, []);

  // Count added/removed lines
  const diffStats = showDiff
    ? {
        added: diffs.filter(d => d.added).reduce((sum, d) => sum + (d.count || 0), 0),
        removed: diffs.filter(d => d.removed).reduce((sum, d) => sum + (d.count || 0), 0),
      }
    : null;

  return (
    <div className="h-full w-[370px] bg-[#1e293b] border-l border-[#334155] flex flex-col animate-slideInRight shrink-0 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-[#334155] shrink-0">
        <span className="text-xs font-semibold text-sky-400 flex items-center gap-1.5">
          <span>🤖</span> Asistente IA (Groq)
        </span>
        <div className="flex items-center gap-1">
          {messages.length > 0 && (
            <button
              onClick={clearChat}
              className="text-[10px] text-slate-500 hover:text-slate-300 px-1.5 py-0.5 rounded hover:bg-[#334155] transition-colors"
              title="Limpiar chat"
            >
              🗑
            </button>
          )}
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 text-sm w-6 h-6 flex items-center justify-center rounded hover:bg-[#334155] transition-colors"
          >
            ✕
          </button>
        </div>
      </div>

      {/* API Key */}
      <div className="px-3.5 py-2 border-b border-[#334155]/60 shrink-0">
        <button
          onClick={() => setShowApiKey(!showApiKey)}
          className="text-[11px] flex items-center gap-1.5 w-full text-left transition-colors"
        >
          <span className={apiKey ? 'text-emerald-500' : 'text-amber-500'}>
            {apiKey ? '🔑' : '⚠️'}
          </span>
          <span className={apiKey ? 'text-emerald-500/80' : 'text-amber-500/80'}>
            {apiKey ? 'API Key configurada' : 'Configurar API Key'}
          </span>
          <span className="text-slate-600 ml-auto text-[9px]">{showApiKey ? '▲' : '▼'}</span>
        </button>
        {showApiKey && (
          <div className="mt-2">
            <input
              type="password"
              value={apiKey}
              onChange={e => onApiKeyChange(e.target.value)}
              className="w-full bg-[#0f172a] border border-[#334155] rounded-lg px-2.5 py-1.5 text-[11px] text-slate-200 font-mono focus:outline-none focus:border-sky-500/60 transition-colors placeholder:text-slate-600"
              placeholder="gsk_xxxxxxxxxxxxxxxx"
            />
            <p className="mt-1.5 text-[9px] text-slate-600 leading-relaxed">
              La clave se almacena solo localmente. Nunca se comparte ni se envía a terceros.
            </p>
          </div>
        )}
      </div>

      {/* Mode tabs */}
      <div className="flex px-2.5 py-2 gap-1 border-b border-[#334155]/60 shrink-0">
        {([
          { key: 'explain' as AIMode, icon: '💬', label: 'Explicar' },
          { key: 'generate' as AIMode, icon: '✨', label: 'Generar' },
          { key: 'refactor' as AIMode, icon: '🔧', label: 'Refactor' },
        ]).map(m => (
          <button
            key={m.key}
            onClick={() => setMode(m.key)}
            className={`flex-1 px-2 py-1.5 text-[10px] font-medium rounded-lg transition-all ${
              mode === m.key
                ? 'bg-sky-500/15 text-sky-400 ring-1 ring-sky-500/20'
                : 'text-slate-500 hover:text-slate-300 hover:bg-[#334155]/40'
            }`}
          >
            {m.icon} {m.label}
          </button>
        ))}
      </div>

      {/* Messages area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3.5 py-3 space-y-3 min-h-0">
        {messages.length === 0 && !error && !showDiff && (
          <div className="text-center py-6">
            <p className="text-2xl mb-2">🤖</p>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Escribe una instrucción para comenzar.
              <br />
              {mode === 'explain' && 'Selecciona código en el editor y pide una explicación.'}
              {mode === 'generate' && 'Describe el HTML/CSS/JS que necesitas.'}
              {mode === 'refactor' && 'Pide mejoras al código actual del editor.'}
            </p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`rounded-lg p-2.5 text-[11px] leading-relaxed ${
              msg.role === 'user'
                ? 'bg-sky-500/10 text-sky-200/90 ml-4 border border-sky-500/10'
                : 'bg-[#0f172a] text-slate-300 mr-2 border border-[#334155]/60'
            }`}
          >
            <pre className="whitespace-pre-wrap break-words font-sans">{msg.content}</pre>
          </div>
        ))}

        {loading && (
          <div className="bg-[#0f172a] rounded-lg p-3 mr-2 border border-[#334155]/60">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
              <span className="text-[11px] text-slate-400">Procesando...</span>
            </div>
          </div>
        )}

        {error && (
          <div className="text-[11px] text-red-400 bg-red-900/20 border border-red-900/30 rounded-lg p-2.5">
            <p className="font-medium mb-1">❌ Error</p>
            <p className="text-red-400/80">{error}</p>
          </div>
        )}

        {/* Diff View */}
        {showDiff && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold text-amber-400 flex items-center gap-1">
                ⚠ Revisión Obligatoria — Diff View
              </span>
              {diffStats && (
                <span className="text-[9px] text-slate-500">
                  <span className="text-emerald-400">+{diffStats.added}</span>
                  <span className="mx-1">/</span>
                  <span className="text-red-400">-{diffStats.removed}</span>
                  <span className="ml-1">líneas</span>
                </span>
              )}
            </div>

            <div className="bg-[#0f172a] rounded-lg border border-[#334155] overflow-hidden">
              <div className="max-h-[250px] overflow-auto p-2 text-[10px] font-mono leading-snug">
                {diffs.map((part, i) => (
                  <div
                    key={i}
                    className={
                      part.added
                        ? 'bg-emerald-500/10 border-l-2 border-emerald-500 pl-2'
                        : part.removed
                          ? 'bg-red-500/10 border-l-2 border-red-500 pl-2 opacity-60'
                          : 'text-slate-600'
                    }
                  >
                    <pre className="whitespace-pre-wrap break-all">
                      {part.added && '+'}
                      {part.removed && '-'}
                      {!part.added && !part.removed && ' '}
                      {part.value}
                    </pre>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={confirmApply}
                className="flex-1 py-2 text-[11px] bg-emerald-600 hover:bg-emerald-500 rounded-lg text-white font-medium transition-colors flex items-center justify-center gap-1"
              >
                ✅ Aplicar Cambios
              </button>
              <button
                onClick={rejectChanges}
                className="flex-1 py-2 text-[11px] bg-[#334155] hover:bg-[#475569] rounded-lg text-slate-300 font-medium transition-colors flex items-center justify-center gap-1"
              >
                ✕ Rechazar
              </button>
            </div>
          </div>
        )}

        {/* Apply button when code is generated */}
        {generatedCode && !showDiff && mode !== 'explain' && messages.length > 0 && (
          <button
            onClick={handleReviewChanges}
            className="w-full py-2.5 text-[11px] bg-amber-600/70 hover:bg-amber-600 rounded-lg text-white font-medium transition-colors flex items-center justify-center gap-1.5"
          >
            🔍 Revisar y Aplicar Cambios (Diff View)
          </button>
        )}
      </div>

      {/* Input area */}
      <div className="px-3.5 py-2.5 border-t border-[#334155] shrink-0 bg-[#162032]">
        <div className="flex gap-2">
          <textarea
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendPrompt();
              }
            }}
            className="flex-1 h-16 bg-[#0f172a] border border-[#334155] rounded-lg px-2.5 py-1.5 text-[11px] text-slate-200 font-mono resize-none focus:outline-none focus:border-sky-500/60 transition-colors placeholder:text-slate-600"
            placeholder={
              !apiKey
                ? 'Configura tu API Key primero...'
                : loading
                  ? 'Esperando respuesta...'
                  : mode === 'generate'
                    ? 'Describe el código a generar...'
                    : 'Escribe tu instrucción...'
            }
            disabled={loading || !apiKey}
          />
          <button
            onClick={sendPrompt}
            disabled={loading || !apiKey || !prompt.trim()}
            className="self-end px-3.5 py-2 text-[11px] bg-sky-600 hover:bg-sky-500 disabled:opacity-30 disabled:hover:bg-sky-600 rounded-lg text-white font-medium transition-colors shrink-0"
          >
            {loading ? '⏳' : 'Enviar ↵'}
          </button>
        </div>
        <p className="mt-1.5 text-[9px] text-slate-600">
          🔒 Los cambios requieren confirmación humana obligatoria ·{' '}
          <kbd className="px-0.5 bg-[#0f172a] rounded text-slate-500">Enter</kbd> enviar ·{' '}
          <kbd className="px-0.5 bg-[#0f172a] rounded text-slate-500">Shift+Enter</kbd> nueva línea
        </p>
      </div>
    </div>
  );
}
