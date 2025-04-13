import React from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomDark } from 'react-syntax-highlighter/dist/esm/styles/prism'; // Choose a theme

interface CodeViewerProps {
  code: string;
  language: string;
  title?: string;
  startCollapsed?: boolean;
}

export function CodeViewer({
  code,
  language,
  title = 'View Source Code',
  startCollapsed = true,
}: CodeViewerProps) {
  return (
    <details className="mt-8 border border-gray-300 rounded-lg overflow-hidden" open={!startCollapsed}>
      <summary className="cursor-pointer bg-gray-100 hover:bg-gray-200 p-3 font-medium text-gray-700 text-sm flex justify-between items-center">
        <span>{title}</span>
        <span className="text-xs text-gray-500">(Click to expand/collapse)</span>
      </summary>
      <div className="bg-[#282c34] text-sm"> {/* Match atomDark background */}
        <SyntaxHighlighter
          language={language}
          style={atomDark}
          showLineNumbers={true}
          customStyle={{ margin: 0, padding: '1rem', borderRadius: '0 0 0.5rem 0.5rem' }} // Remove default margin/padding
          codeTagProps={{ style: { fontFamily: 'Consolas, Monaco, "Andale Mono", "Ubuntu Mono", monospace' } }}
        >
          {code.trim()}
        </SyntaxHighlighter>
      </div>
    </details>
  );
}