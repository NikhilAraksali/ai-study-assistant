import React from 'react';
import { LucideIcon, FolderOpen } from 'lucide-react';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon = FolderOpen,
  title,
  description,
  actionLabel,
  onAction
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center bg-[#111113] border border-[#242428] rounded-2xl">
      <div className="w-12 h-12 rounded-xl bg-[#161618] border border-[#242428] flex items-center justify-center text-[#5B8CFF] mb-3">
        <Icon className="w-6 h-6" />
      </div>
      <h3 className="text-sm font-semibold text-[#F5F5F5]">{title}</h3>
      <p className="text-xs text-[#71717A] max-w-sm mt-1">{description}</p>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="mt-4 px-4 py-2 rounded-xl text-xs font-semibold bg-[#5B8CFF] hover:bg-[#4879EB] text-white transition shadow-[0_2px_12px_rgba(91,140,255,0.3)]"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
};
