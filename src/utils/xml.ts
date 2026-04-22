import { computeDiff } from './diff';
import type { Comment } from '../types';

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function generateXml(
  filePath: string,
  original: string,
  modified: string,
  comments: Comment[]
): string {
  const hasChanges = original !== modified;
  let xml = `<review>\n  <plan file="${escapeXml(filePath)}"/>\n`;

  if (hasChanges) {
    const diff = computeDiff(original, modified, filePath);
    xml += `  <diff><![CDATA[\n${diff}\n  ]]></diff>\n`;
  }

  for (const c of comments) {
    xml += `  <comment id="${c.id}">\n`;
    xml += `    <quote lines="${c.lines[0]}-${c.lines[1]}">${escapeXml(c.quote)}</quote>\n`;
    xml += `    ${escapeXml(c.text)}\n`;
    xml += `  </comment>\n`;
  }

  xml += '</review>';
  return xml;
}
