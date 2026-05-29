import { useEffect, useState } from 'react';

interface Props {
  html: string;
}

export default function Preview({ html }: Props) {
  const [debouncedHtml, setDebouncedHtml] = useState(html);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedHtml(html), 350);
    return () => clearTimeout(timer);
  }, [html]);

  return (
    <div className="h-full w-full flex flex-col bg-[#f8fafc]">
      <div className="h-7 bg-[#e2e8f0] border-b border-[#cbd5e1] flex items-center px-3 shrink-0">
        <div className="flex gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#ef4444]" />
          <span className="w-2.5 h-2.5 rounded-full bg-[#f59e0b]" />
          <span className="w-2.5 h-2.5 rounded-full bg-[#22c55e]" />
        </div>
        <span className="ml-3 text-[10px] text-[#64748b] font-medium truncate">
          Vista Previa en Vivo
        </span>
      </div>
      <iframe
        srcDoc={debouncedHtml}
        sandbox="allow-scripts allow-same-origin"
        className="flex-1 w-full border-0 bg-white"
        title="Vista Previa"
      />
    </div>
  );
}
