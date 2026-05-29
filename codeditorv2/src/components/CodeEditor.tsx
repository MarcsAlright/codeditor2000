import { useCallback } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { html } from '@codemirror/lang-html';
import { oneDark } from '@codemirror/theme-one-dark';

interface Props {
  value: string;
  onChange: (value: string) => void;
}

export default function CodeEditor({ value, onChange }: Props) {
  const handleChange = useCallback((val: string) => {
    onChange(val);
  }, [onChange]);

  return (
    <div className="h-full w-full overflow-hidden">
      <CodeMirror
        value={value}
        height="100%"
        theme={oneDark}
        extensions={[html()]}
        onChange={handleChange}
      />
    </div>
  );
}
