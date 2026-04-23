import { useState } from 'react';
import { useReviewState } from '../hooks/useReviewState';
import { generateXml } from '../utils/xml';

export function CopyXmlButton() {
  const { original, markdown, comments, filePath } = useReviewState();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const xml = generateXml(filePath, original, markdown, comments);
    try {
      await navigator.clipboard.writeText(xml);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      console.error('Failed to copy to clipboard');
      console.log(xml);
    }
  };

  return (
    <div className="p-3 border-t border-slate-200/70 bg-slate-50/40">
      <button
        onClick={handleCopy}
        className={`w-full h-10 inline-flex items-center justify-center gap-2 text-[13px] font-semibold rounded-lg transition shadow-sm ${
          copied
            ? 'bg-emerald-600 text-white'
            : 'bg-gradient-to-b from-slate-900 to-slate-800 text-white hover:from-slate-800 hover:to-slate-700 active:from-slate-950 active:to-slate-900'
        }`}
      >
        {copied ? (
          <>
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6L9 17l-5-5" />
            </svg>
            Copied!
          </>
        ) : (
          <>
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
            Copy as XML
          </>
        )}
      </button>
    </div>
  );
}
