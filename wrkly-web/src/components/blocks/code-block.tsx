'use client';

import { useState, useCallback, useRef } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

const LANGUAGES = [
  'javascript', 'typescript', 'python', 'html', 'css',
  'json', 'sql', 'bash', 'rust', 'go', 'other',
] as const;

interface CodeBlockContent {
  code?: string;
  language?: string;
}

interface CodeBlockProps {
  content: CodeBlockContent;
  onUpdate: (content: CodeBlockContent) => void;
}

export function CodeBlock({ content, onUpdate }: CodeBlockProps) {
  const [code, setCode] = useState(content.code ?? '');
  const [language, setLanguage] = useState(content.language ?? 'javascript');
  const [showLangPicker, setShowLangPicker] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const triggerSave = useCallback(
    (newCode: string, newLang: string) => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        onUpdate({ code: newCode, language: newLang });
      }, 500);
    },
    [onUpdate]
  );

  return (
    <div className="overflow-hidden rounded-md border border-border bg-[#0d1117]">
      {/* Language picker header */}
      <div className="flex items-center justify-between border-b border-border/30 px-3 py-1.5 bg-[#161b22]">
        <div className="relative">
          <button
            className="flex items-center gap-1 text-xs text-muted-foreground/80 hover:text-muted-foreground transition-colors"
            onClick={() => setShowLangPicker((v) => !v)}
          >
            {language}
            <ChevronDown className="h-3 w-3" />
          </button>
          {showLangPicker && (
            <div className="absolute left-0 top-full z-20 mt-1 rounded-md border border-border bg-popover shadow-lg">
              {LANGUAGES.map((lang) => (
                <button
                  key={lang}
                  className={cn(
                    'block w-full px-4 py-1.5 text-left text-xs hover:bg-accent capitalize transition-colors',
                    lang === language && 'text-primary font-medium'
                  )}
                  onClick={() => {
                    setLanguage(lang);
                    setShowLangPicker(false);
                    triggerSave(code, lang);
                  }}
                >
                  {lang}
                </button>
              ))}
            </div>
          )}
        </div>
        <span className="text-[10px] text-muted-foreground/40">code</span>
      </div>

      {/* Code textarea */}
      <textarea
        className="w-full resize-none bg-transparent px-4 py-3 font-mono text-[13px] leading-relaxed text-green-300/90 focus:outline-none min-h-[80px]"
        style={{ fontFamily: "'JetBrains Mono', 'Fira Code', 'Courier New', monospace" }}
        spellCheck={false}
        value={code}
        onChange={(e) => {
          setCode(e.target.value);
          triggerSave(e.target.value, language);
        }}
        onBlur={() => onUpdate({ code, language })}
        placeholder={`// ${language} code here…`}
        rows={Math.max(3, code.split('\n').length)}
      />
    </div>
  );
}
