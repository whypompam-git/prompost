import { Fragment } from "react";

// Renders **bold** and __underline__ markers safely — tokenized into React
// elements directly, never dangerouslySetInnerHTML, so there's no HTML/XSS
// surface no matter what a staff member (or a compromised account) types.
export function ScriptText({ text, className }: { text: string; className?: string }) {
  const pattern = /\*\*(.+?)\*\*|__(.+?)__/g;
  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = pattern.exec(text))) {
    if (match.index > lastIndex) {
      nodes.push(<Fragment key={key++}>{text.slice(lastIndex, match.index)}</Fragment>);
    }
    if (match[1] !== undefined) {
      nodes.push(<strong key={key++}>{match[1]}</strong>);
    } else {
      nodes.push(<u key={key++}>{match[2]}</u>);
    }
    lastIndex = pattern.lastIndex;
  }
  if (lastIndex < text.length) {
    nodes.push(<Fragment key={key++}>{text.slice(lastIndex)}</Fragment>);
  }

  return <div className={`whitespace-pre-wrap ${className ?? ""}`}>{nodes}</div>;
}
