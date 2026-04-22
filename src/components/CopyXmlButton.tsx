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
    <div className="p-3 border-t border-gray-200">
      <button
        onClick={handleCopy}
        className="w-full bg-blue-600 text-white text-sm font-medium py-2 px-4 rounded hover:bg-blue-700 transition"
      >
        {copied ? 'Copied!' : 'Copy XML'}
      </button>
    </div>
  );
}
