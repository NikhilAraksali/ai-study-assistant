import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Copy, Check, Terminal } from 'lucide-react';

interface FormattedAiResponseProps {
  content: string;
  className?: string;
  isUser?: boolean;
}

export const FormattedAiResponse: React.FC<FormattedAiResponseProps> = ({
  content,
  className = '',
  isUser = false
}) => {
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);

  const handleCopyCode = (codeText: string, id: string) => {
    navigator.clipboard?.writeText(codeText);
    setCopiedCodeId(id);
    setTimeout(() => setCopiedCodeId(null), 2000);
  };

  if (isUser) {
    return <div className={`whitespace-pre-wrap text-xs sm:text-sm text-[#F5F5F5] leading-relaxed ${className}`}>{content}</div>;
  }

  return (
    <div className={`ai-formatted-markdown text-xs sm:text-sm leading-relaxed space-y-3 font-sans ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h1 className="text-sm sm:text-base font-bold text-[#F5F5F5] mt-3.5 mb-1.5 pb-1 border-b border-[#242428]">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-xs sm:text-sm font-semibold text-[#F5F5F5] mt-3 mb-1">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-xs font-semibold text-[#5B8CFF] mt-2 mb-1">
              {children}
            </h3>
          ),
          h4: ({ children }) => (
            <h4 className="text-xs font-medium text-[#5B8CFF] mt-2 mb-1">
              {children}
            </h4>
          ),
          p: ({ children }) => (
            <div className="my-1.5 leading-relaxed text-[#A1A1AA] break-words">
              {children}
            </div>
          ),
          pre: ({ children }) => <>{children}</>,
          ul: ({ children }) => (
            <ul className="my-1.5 space-y-1 pl-4 list-disc marker:text-[#5B8CFF]">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="my-1.5 space-y-1 pl-4 list-decimal marker:font-bold marker:text-[#5B8CFF]">
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li className="leading-relaxed text-[#A1A1AA] pl-1">
              {children}
            </li>
          ),
          strong: ({ children }) => (
            <strong className="font-semibold text-[#F5F5F5]">
              {children}
            </strong>
          ),
          em: ({ children }) => (
            <em className="italic text-[#71717A]">
              {children}
            </em>
          ),
          blockquote: ({ children }) => (
            <blockquote className="my-2 border-l-2 border-[#5B8CFF] pl-3 py-1 bg-[#161618] rounded-r-lg text-xs italic text-[#F5F5F5]">
              {children}
            </blockquote>
          ),
          code: ({ inline, className: codeClassName, children, ...props }: any) => {
            const match = /language-(\w+)/.exec(codeClassName || '');
            const rawCode = String(children).replace(/\n$/, '');
            const codeId = `code_${Math.random().toString(36).substring(2, 7)}`;

            if (inline) {
              return (
                <code
                  className="px-1.5 py-0.5 rounded-md bg-[#161618] border border-[#242428] font-mono text-[11px] text-[#5B8CFF]"
                  {...props}
                >
                  {children}
                </code>
              );
            }

            return (
              <div className="my-3 rounded-xl overflow-hidden border border-[#27272A] bg-[#09090B] shadow-lg">
                {/* Code Block Header */}
                <div className="px-3.5 py-1.5 bg-[#111113] border-b border-[#27272A] flex items-center justify-between">
                  <div className="flex items-center space-x-2 text-[10px] font-mono text-[#71717A]">
                    <Terminal className="w-3 h-3 text-[#5B8CFF]" />
                    <span className="uppercase">{match ? match[1] : 'CODE'}</span>
                  </div>
                  <button
                    onClick={() => handleCopyCode(rawCode, codeId)}
                    className="flex items-center space-x-1 text-[10px] font-mono text-[#71717A] hover:text-[#F5F5F5] transition"
                  >
                    {copiedCodeId === codeId ? (
                      <>
                        <Check className="w-3 h-3 text-[#65D6B0]" />
                        <span className="text-[#65D6B0]">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Code Body */}
                <div className="p-3.5 overflow-x-auto font-mono text-xs text-[#E4E4E7] leading-relaxed">
                  <pre>{rawCode}</pre>
                </div>
              </div>
            );
          },
          table: ({ children }) => (
            <div className="my-3 overflow-x-auto rounded-xl border border-[#242428] bg-[#111113]">
              <table className="min-w-full text-xs text-left divide-y divide-[#242428]">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-[#161618] text-[#F5F5F5] font-semibold">
              {children}
            </thead>
          ),
          tbody: ({ children }) => (
            <tbody className="divide-y divide-[#242428] text-[#A1A1AA]">
              {children}
            </tbody>
          ),
          th: ({ children }) => (
            <th className="px-3 py-2 text-xs font-semibold">{children}</th>
          ),
          td: ({ children }) => (
            <td className="px-3 py-2 text-xs">{children}</td>
          )
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};
