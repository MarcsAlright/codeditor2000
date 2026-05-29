import { useState, useEffect, useCallback, useRef } from 'react';
import CodeEditor from './components/CodeEditor';
import Preview from './components/Preview';
import SearchReplace from './components/SearchReplace';
import CommandPalette from './components/CommandPalette';
import type { Command } from './components/CommandPalette';
import AIPanel from './components/AIPanel';

/* ---------- types ---------- */
interface FileData {
  id: string;
  name: string;
  content: string;
}

interface Toast {
  id: number;
  message: string;
  type: 'success' | 'info' | 'warning';
}

/* ---------- constants ---------- */
const STORAGE_KEY = 'ferreteria-editor-state-v2';
const API_KEY_KEY = 'ferreteria-groq-key-v2';

const DEFAULT_HTML = `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Ferreteria El Clavo - Sistema de Gestion</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: #f0f4f8;
            color: #1e293b;
            line-height: 1.6;
        }
        .header {
            background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%);
            color: #e2e8f0;
            padding: 0 32px;
            height: 64px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            box-shadow: 0 4px 20px rgba(0,0,0,0.15);
        }
        .logo { display: flex; align-items: center; gap: 12px; font-size: 20px; font-weight: 700; }
        .logo span { color: #38bdf8; }
        .nav { display: flex; gap: 4px; }
        .nav a {
            color: #94a3b8; text-decoration: none; font-size: 14px;
            padding: 8px 16px; border-radius: 8px; transition: all 0.2s;
        }
        .nav a:hover, .nav a.active { color: #e2e8f0; background: rgba(255,255,255,0.08); }
        .nav a.active { background: rgba(56,189,248,0.15); color: #38bdf8; }
        .dashboard { max-width: 1100px; margin: 0 auto; padding: 28px 24px; }
        .page-title { font-size: 24px; font-weight: 700; margin-bottom: 24px; color: #0f172a; }
        .stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 28px; }
        .stat-card {
            background: white; border-radius: 12px; padding: 20px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.06); border: 1px solid #e2e8f0;
            transition: transform 0.15s, box-shadow 0.15s;
        }
        .stat-card:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.08); }
        .stat-card .label {
            font-size: 11px; color: #64748b; text-transform: uppercase;
            letter-spacing: 1px; font-weight: 600;
        }
        .stat-card .value { font-size: 32px; font-weight: 700; color: #0f172a; margin: 6px 0 4px; }
        .stat-card .change { font-size: 12px; display: flex; align-items: center; gap: 4px; }
        .stat-card .change.up { color: #16a34a; }
        .stat-card .change.down { color: #dc2626; }
        .stat-card .change.warn { color: #d97706; }
        .panel {
            background: white; border-radius: 12px; padding: 24px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.06); border: 1px solid #e2e8f0;
        }
        .panel-header {
            display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px;
        }
        .panel-header h2 { font-size: 16px; font-weight: 600; color: #0f172a; }
        .btn {
            display: inline-flex; align-items: center; gap: 6px; padding: 8px 16px;
            border: none; border-radius: 8px; font-size: 13px; font-weight: 500;
            cursor: pointer; transition: all 0.15s;
        }
        .btn-primary { background: #0f172a; color: white; }
        .btn-primary:hover { background: #1e293b; }
        .btn-outline { background: transparent; color: #475569; border: 1px solid #e2e8f0; }
        .btn-outline:hover { background: #f8fafc; border-color: #cbd5e1; }
        .search-bar { display: flex; gap: 10px; margin-bottom: 16px; }
        .search-bar input {
            flex: 1; padding: 10px 16px; border: 1px solid #e2e8f0;
            border-radius: 8px; font-size: 14px; outline: none;
            transition: border-color 0.2s, box-shadow 0.2s;
        }
        .search-bar input:focus { border-color: #38bdf8; box-shadow: 0 0 0 3px rgba(56,189,248,0.1); }
        table { width: 100%; border-collapse: collapse; }
        th {
            text-align: left; padding: 10px 12px; font-size: 11px; color: #64748b;
            text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;
            background: #f8fafc; border-bottom: 1px solid #e2e8f0;
        }
        td { padding: 12px; font-size: 13px; border-bottom: 1px solid #f1f5f9; }
        tr:hover td { background: #f8fafc; }
        .badge { display: inline-block; padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 600; }
        .badge-green { background: #dcfce7; color: #166534; }
        .badge-yellow { background: #fef9c3; color: #854d0e; }
        .badge-red { background: #fee2e2; color: #991b1b; }
        .product-name { font-weight: 500; color: #0f172a; }
        .product-code { font-family: 'Consolas', monospace; font-size: 12px; color: #64748b; }
        .footer { text-align: center; padding: 20px; color: #94a3b8; font-size: 12px; margin-top: 20px; }
    </style>
</head>
<body>
    <header class="header">
        <div class="logo">
            &#x1F527; Ferreteria <span>El Clavo</span>
        </div>
        <nav class="nav">
            <a href="#" class="active">&#x1F4CA; Dashboard</a>
            <a href="#">&#x1F4E6; Inventario</a>
            <a href="#">&#x1F4B0; Ventas</a>
            <a href="#">&#x1F465; Clientes</a>
            <a href="#">&#x1F4C8; Reportes</a>
        </nav>
    </header>

    <main class="dashboard">
        <h1 class="page-title">Panel de Control</h1>

        <div class="stats">
            <div class="stat-card">
                <div class="label">Total Productos</div>
                <div class="value">1,247</div>
                <div class="change up">&#x2191; 12% este mes</div>
            </div>
            <div class="stat-card">
                <div class="label">Ventas Hoy</div>
                <div class="value">$8,450</div>
                <div class="change up">&#x2191; 8% vs ayer</div>
            </div>
            <div class="stat-card">
                <div class="label">Clientes Activos</div>
                <div class="value">384</div>
                <div class="change up">&#x2191; 5 nuevos</div>
            </div>
            <div class="stat-card">
                <div class="label">Stock Bajo</div>
                <div class="value">23</div>
                <div class="change warn">&#x26A0; Requiere atencion</div>
            </div>
        </div>

        <div class="panel">
            <div class="panel-header">
                <h2>&#x1F4E6; Productos Recientes</h2>
                <button class="btn btn-primary">+ Nuevo Producto</button>
            </div>

            <div class="search-bar">
                <input type="text" placeholder="Buscar producto por nombre o codigo...">
                <button class="btn btn-outline">Filtros</button>
            </div>

            <table>
                <thead>
                    <tr>
                        <th>Codigo</th>
                        <th>Producto</th>
                        <th>Categoria</th>
                        <th>Precio</th>
                        <th>Stock</th>
                        <th>Estado</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td><span class="product-code">FER-001</span></td>
                        <td><span class="product-name">Martillo 16oz Stanley</span></td>
                        <td>Herramientas</td>
                        <td>$15.99</td>
                        <td>45</td>
                        <td><span class="badge badge-green">En Stock</span></td>
                    </tr>
                    <tr>
                        <td><span class="product-code">FER-002</span></td>
                        <td><span class="product-name">Tornillos Phillips 2" x100</span></td>
                        <td>Fijaciones</td>
                        <td>$4.50</td>
                        <td>200</td>
                        <td><span class="badge badge-green">En Stock</span></td>
                    </tr>
                    <tr>
                        <td><span class="product-code">FER-003</span></td>
                        <td><span class="product-name">Pintura Latex Blanca 4L</span></td>
                        <td>Pinturas</td>
                        <td>$28.90</td>
                        <td>8</td>
                        <td><span class="badge badge-yellow">Stock Bajo</span></td>
                    </tr>
                    <tr>
                        <td><span class="product-code">FER-004</span></td>
                        <td><span class="product-name">Cable Electrico 12AWG x30m</span></td>
                        <td>Electrico</td>
                        <td>$45.00</td>
                        <td>3</td>
                        <td><span class="badge badge-red">Critico</span></td>
                    </tr>
                    <tr>
                        <td><span class="product-code">FER-005</span></td>
                        <td><span class="product-name">Llave Inglesa Ajustable 10"</span></td>
                        <td>Herramientas</td>
                        <td>$22.50</td>
                        <td>30</td>
                        <td><span class="badge badge-green">En Stock</span></td>
                    </tr>
                    <tr>
                        <td><span class="product-code">FER-006</span></td>
                        <td><span class="product-name">Sierra Caladora Bosch</span></td>
                        <td>Herramientas</td>
                        <td>$89.99</td>
                        <td>12</td>
                        <td><span class="badge badge-green">En Stock</span></td>
                    </tr>
                    <tr>
                        <td><span class="product-code">FER-007</span></td>
                        <td><span class="product-name">Tubo PVC 4" x3m</span></td>
                        <td>Plomeria</td>
                        <td>$12.75</td>
                        <td>5</td>
                        <td><span class="badge badge-yellow">Stock Bajo</span></td>
                    </tr>
                </tbody>
            </table>
        </div>

        <div class="footer">
            Ferreteria El Clavo &mdash; Sistema de Gestion v1.0 &mdash; Todos los derechos reservados
        </div>
    </main>
</body>
</html>`;

/* ---------- initial state ---------- */
function loadInitialState(): { files: FileData[]; activeFileId: string } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.files?.length > 0) {
        return {
          files: parsed.files,
          activeFileId: parsed.activeFileId || parsed.files[0].id,
        };
      }
    }
  } catch {
    /* ignore */
  }
  return {
    files: [{ id: '1', name: 'index.html', content: DEFAULT_HTML }],
    activeFileId: '1',
  };
}

const INITIAL = loadInitialState();

/* ---------- component ---------- */
export default function App() {
  /* ---- state ---- */
  const [files, setFiles] = useState<FileData[]>(INITIAL.files);
  const [activeFileId, setActiveFileId] = useState<string>(INITIAL.activeFileId);
  const [showSearch, setShowSearch] = useState(false);
  const [showCmdPalette, setShowCmdPalette] = useState(false);
  const [showAIPanel, setShowAIPanel] = useState(false);
  const [showPreview, setShowPreview] = useState(true);
  const [splitPos, setSplitPos] = useState(50);
  const [isResizing, setIsResizing] = useState(false);
  const [groqKey, setGroqKey] = useState(() => localStorage.getItem(API_KEY_KEY) || '');
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving'>('saved');

  const containerRef = useRef<HTMLDivElement>(null);
  const toastCounter = useRef(0);

  /* ---- derived ---- */
  const activeFile = files.find(f => f.id === activeFileId) || files[0];

  /* ---- persistence ---- */
  useEffect(() => {
    if (files.length === 0) return;
    setSaveStatus('saving');
    const t = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ files, activeFileId }));
      } catch {
        /* quota exceeded */
      }
      setSaveStatus('saved');
    }, 600);
    return () => clearTimeout(t);
  }, [files, activeFileId]);

  useEffect(() => {
    localStorage.setItem(API_KEY_KEY, groqKey);
  }, [groqKey]);

  /* ---- toast ---- */
  const toast = useCallback((message: string, type: Toast['type'] = 'success') => {
    const id = ++toastCounter.current;
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000);
  }, []);

  /* ---- content ---- */
  const updateContent = useCallback(
    (next: string) => {
      setFiles(prev => prev.map(f => (f.id === activeFileId ? { ...f, content: next } : f)));
    },
    [activeFileId],
  );

  /* ---- file ops ---- */
  const newFile = useCallback(() => {
    const id = Date.now().toString();
    setFiles(prev => [...prev, { id, name: `archivo-${prev.length + 1}.html`, content: '' }]);
    setActiveFileId(id);
    toast('Nuevo archivo creado', 'info');
  }, [toast]);

  const closeFile = useCallback(
    (id: string) => {
      setFiles(prev => {
        const next = prev.filter(f => f.id !== id);
        if (next.length === 0) {
          const def = { id: Date.now().toString(), name: 'index.html', content: DEFAULT_HTML };
          setActiveFileId(def.id);
          return [def];
        }
        if (activeFileId === id) setActiveFileId(next[0].id);
        return next;
      });
      toast('Archivo cerrado', 'info');
    },
    [activeFileId, toast],
  );

  const exportFile = useCallback(() => {
    if (!activeFile) return;
    const blob = new Blob([activeFile.content], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = activeFile.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast(`Exportado: ${activeFile.name}`);
  }, [activeFile, toast]);

  const importFile = useCallback(() => {
    const inp = document.createElement('input');
    inp.type = 'file';
    inp.accept = '.html,.htm,.css,.js,.txt,.svg';
    inp.onchange = () => {
      const file = inp.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const id = Date.now().toString();
        setFiles(prev => [...prev, { id, name: file.name, content: reader.result as string }]);
        setActiveFileId(id);
        toast(`Importado: ${file.name}`);
      };
      reader.readAsText(file);
    };
    inp.click();
  }, [toast]);

  const formatCode = useCallback(() => {
    if (!activeFile) return;
    let src = activeFile.content;
    src = src.replace(/>\s*</g, '>\n<');
    let indent = 0;
    const lines = src.split('\n');
    const out = lines.map(line => {
      const t = line.trim();
      if (!t) return '';
      if (t.match(/^<\/[^!][^>]*>/)) indent = Math.max(0, indent - 1);
      const res = '  '.repeat(indent) + t;
      if (
        t.match(/^<[^/!][^>]*[^/]>.+$/) &&
        !t.match(/<\/[^>]+>$/) &&
        !t.match(
          /<(br|hr|img|input|meta|link|area|base|col|embed|source|track|wbr)\b/i,
        )
      )
        indent++;
      return res;
    });
    updateContent(out.join('\n'));
    toast('Codigo formateado (basico)', 'info');
  }, [activeFile, updateContent, toast]);

  /* ---- keyboard shortcuts ---- */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && (e.key === 'P' || e.key === 'p')) {
        e.preventDefault();
        setShowCmdPalette(true);
      }
      if (e.ctrlKey && e.shiftKey && (e.key === 'F' || e.key === 'f')) {
        e.preventDefault();
        setShowSearch(true);
      }
      if (e.ctrlKey && (e.key === 'j' || e.key === 'J')) {
        e.preventDefault();
        setShowAIPanel(p => !p);
      }
      if (e.ctrlKey && (e.key === 'b' || e.key === 'B')) {
        e.preventDefault();
        setShowPreview(p => !p);
      }
      if (e.ctrlKey && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        toast('Guardado automatico activo', 'info');
      }
      if (e.ctrlKey && (e.key === 'n' || e.key === 'N')) {
        e.preventDefault();
        newFile();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [toast, newFile]);

  /* ---- resize ---- */
  const onResizeStart = useCallback(() => setIsResizing(true), []);

  useEffect(() => {
    if (!isResizing) return;
    const move = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      setSplitPos(Math.max(25, Math.min(75, ((e.clientX - rect.left) / rect.width) * 100)));
    };
    const up = () => setIsResizing(false);
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
    return () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
    };
  }, [isResizing]);

  /* ---- commands ---- */
  const commands: Command[] = [
    { id: 'toggle-preview', label: 'Alternar Vista Previa', shortcut: 'Ctrl+B', icon: '👁', category: 'Vista', action: () => setShowPreview(p => !p) },
    { id: 'toggle-ai', label: 'Alternar Panel de IA', shortcut: 'Ctrl+J', icon: '🤖', category: 'Vista', action: () => setShowAIPanel(p => !p) },
    { id: 'search', label: 'Buscar y Reemplazar Bloques', shortcut: 'Ctrl+Shift+F', icon: '🔍', category: 'Editar', action: () => setShowSearch(true) },
    { id: 'palette', label: 'Abrir Paleta de Comandos', shortcut: 'Ctrl+Shift+P', icon: '⌘', category: 'General', action: () => setShowCmdPalette(true) },
    { id: 'new', label: 'Nuevo Archivo', shortcut: 'Ctrl+N', icon: '📄', category: 'Archivo', action: newFile },
    { id: 'export', label: 'Exportar Archivo HTML', icon: '💾', category: 'Archivo', action: exportFile },
    { id: 'import', label: 'Importar Archivo', icon: '📂', category: 'Archivo', action: importFile },
    { id: 'format', label: 'Formatear Codigo (Basico)', icon: '📐', category: 'Editar', action: formatCode },
    { id: 'clear', label: 'Limpiar Editor', icon: '🗑', category: 'Editar', action: () => { updateContent(''); toast('Editor limpiado', 'info'); } },
    { id: 'reset', label: 'Restablecer Contenido por Defecto', icon: '↩', category: 'Archivo', action: () => { updateContent(DEFAULT_HTML); toast('Contenido restablecido', 'info'); } },
  ];

  /* ---- stats ---- */
  const lines = activeFile?.content.split('\n').length ?? 0;
  const chars = activeFile?.content.length ?? 0;
  const size = (new Blob([activeFile?.content || '']).size / 1024).toFixed(1);

  /* ====== render ====== */
  return (
    <div
      className="h-screen w-screen flex flex-col bg-[#0f172a] text-slate-200 overflow-hidden"
      style={{ fontFamily: "'Inter','Segoe UI',system-ui,sans-serif", userSelect: isResizing ? 'none' : 'auto' }}
    >
      {/* ========== TOOLBAR ========== */}
      <header className="h-10 bg-[#1e293b] border-b border-[#334155] flex items-center px-2 gap-0.5 shrink-0 select-none">
        {/* logo */}
        <div className="flex items-center gap-2 px-2 mr-1">
          <span className="text-base leading-none">⚙</span>
          <span className="text-[12px] font-semibold text-sky-400 tracking-tight hidden sm:inline">Ferretería Editor</span>
        </div>
        <div className="w-px h-5 bg-[#334155] mx-1" />

        {/* file ops */}
        <TBtn onClick={newFile} title="Nuevo (Ctrl+N)">+ Nuevo</TBtn>
        <TBtn onClick={importFile} title="Importar archivo">📂 Importar</TBtn>
        <TBtn onClick={exportFile} title="Exportar archivo">💾 Exportar</TBtn>
        <div className="w-px h-5 bg-[#334155] mx-1" />
        <TBtn onClick={() => setShowSearch(true)} title="Buscar bloques (Ctrl+Shift+F)">🔍 Bloques</TBtn>
        <TBtn onClick={formatCode} title="Formatear código">📐 Formatear</TBtn>

        <div className="flex-1" />

        {/* view toggles */}
        <ToggleBtn active={showPreview} onClick={() => setShowPreview(p => !p)} title="Vista previa (Ctrl+B)">👁 Preview</ToggleBtn>
        <ToggleBtn active={showAIPanel} onClick={() => setShowAIPanel(p => !p)} title="Panel IA (Ctrl+J)">🤖 IA</ToggleBtn>
        <TBtn onClick={() => setShowCmdPalette(true)} title="Paleta (Ctrl+Shift+P)">⌘ Comandos</TBtn>
      </header>

      {/* ========== TABS ========== */}
      <div className="h-8 bg-[#0b1120] border-b border-[#1e293b] flex items-end px-1 gap-0 overflow-x-auto shrink-0 select-none">
        {files.map(f => (
          <div
            key={f.id}
            onClick={() => setActiveFileId(f.id)}
            className={`group flex items-center gap-1 px-3 py-1.5 text-[11px] cursor-pointer rounded-t transition-colors border-t-2 shrink-0 ${
              f.id === activeFileId
                ? 'bg-[#1e293b] text-slate-200 border-t-sky-500'
                : 'text-slate-500 hover:text-slate-300 hover:bg-[#1e293b]/40 border-t-transparent'
            }`}
          >
            <span className="text-[10px] opacity-70">📄</span>
            <span className="max-w-[120px] truncate">{f.name}</span>
            {files.length > 1 && (
              <button
                onClick={e => { e.stopPropagation(); closeFile(f.id); }}
                className="text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity ml-0.5 text-[10px] leading-none"
              >
                ×
              </button>
            )}
          </div>
        ))}
        <button onClick={newFile} className="px-2 py-1.5 text-slate-600 hover:text-slate-300 text-xs transition-colors shrink-0" title="Nuevo archivo">+</button>
      </div>

      {/* ========== MAIN AREA ========== */}
      <div ref={containerRef} className="flex-1 flex overflow-hidden min-h-0">
        {/* Editor pane */}
        <div
          className="overflow-hidden min-w-0"
          style={{ width: showPreview ? `${splitPos}%` : '100%', transition: isResizing ? 'none' : 'width 0.15s ease' }}
        >
          <CodeEditor value={activeFile?.content ?? ''} onChange={updateContent} />
        </div>

        {/* Resizer */}
        {showPreview && (
          <div
            onMouseDown={onResizeStart}
            className={`resizer-handle w-[3px] shrink-0 cursor-col-resize ${isResizing ? 'bg-sky-500' : 'bg-[#334155]'}`}
          />
        )}

        {/* Preview pane */}
        {showPreview && (
          <div
            className="overflow-hidden min-w-0 border-l border-[#334155]/30"
            style={{ width: `${100 - splitPos}%`, transition: isResizing ? 'none' : 'width 0.15s ease' }}
          >
            <Preview html={activeFile?.content ?? ''} />
          </div>
        )}

        {/* AI Panel */}
        {showAIPanel && (
          <AIPanel
            apiKey={groqKey}
            onApiKeyChange={setGroqKey}
            currentContent={activeFile?.content ?? ''}
            onApplyChanges={updateContent}
            onClose={() => setShowAIPanel(false)}
          />
        )}
      </div>

      {/* ========== STATUS BAR ========== */}
      <footer className="h-6 bg-[#1e293b] border-t border-[#334155] flex items-center px-3 text-[10px] text-slate-500 shrink-0 gap-3 select-none">
        <span className="text-slate-400 font-medium">HTML</span>
        <Sep />
        <span>Lineas: {lines.toLocaleString()}</span>
        <Sep />
        <span>Caracteres: {chars.toLocaleString()}</span>
        <Sep />
        <span>{size} KB</span>
        <Sep />
        <span>UTF-8</span>
        <div className="flex-1" />
        <span className="flex items-center gap-1.5">
          <span className={`w-1.5 h-1.5 rounded-full ${saveStatus === 'saved' ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`} />
          <span className={saveStatus === 'saved' ? 'text-emerald-500/70' : 'text-amber-500/70'}>
            {saveStatus === 'saved' ? 'Guardado' : 'Guardando...'}
          </span>
        </span>
      </footer>

      {/* ========== MODALS ========== */}
      {showSearch && activeFile && (
        <SearchReplace content={activeFile.content} onClose={() => setShowSearch(false)} onApply={updateContent} />
      )}
      {showCmdPalette && (
        <CommandPalette commands={commands} onClose={() => setShowCmdPalette(false)} />
      )}

      {/* ========== TOASTS ========== */}
      <div className="fixed bottom-10 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
        {toasts.map(t => (
          <div
            key={t.id}
            className="animate-slideInUp bg-[#1e293b] border border-[#334155] text-slate-200 text-[11px] px-4 py-2.5 rounded-lg shadow-xl flex items-center gap-2 pointer-events-auto"
          >
            <span className={t.type === 'success' ? 'text-emerald-400' : t.type === 'warning' ? 'text-amber-400' : 'text-sky-400'}>
              {t.type === 'success' ? '✓' : t.type === 'warning' ? '⚠' : 'ℹ'}
            </span>
            {t.message}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---- tiny helper components ---- */
function TBtn({ onClick, title, children }: { onClick: () => void; title?: string; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="px-2 py-1 text-[11px] text-slate-300 hover:bg-[#334155] rounded-md transition-colors whitespace-nowrap"
    >
      {children}
    </button>
  );
}

function ToggleBtn({ active, onClick, title, children }: { active: boolean; onClick: () => void; title?: string; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`px-2 py-1 text-[11px] rounded-md transition-colors whitespace-nowrap ${
        active ? 'bg-sky-500/15 text-sky-400' : 'text-slate-400 hover:bg-[#334155]'
      }`}
    >
      {children}
    </button>
  );
}

function Sep() {
  return <span className="text-[#334155]">|</span>;
}
