'use client';

import type { ReactNode } from 'react';
import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  labelledBy: string;
  children: ReactNode;
  className?: string;
}

/**
 * A native <dialog>, opened as a modal when `open` is true.
 *
 * The browser supplies Escape to close, the backdrop, and keeping focus inside while
 * open. Several pages open dialogs, so the open/close plumbing lives here once.
 */
export function Modal({ open, onClose, labelledBy, children, className }: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    else if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={labelledBy}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      className={cn(
        'w-[min(520px,calc(100vw-2rem))] rounded-card border border-hairline bg-surface p-0 text-ink shadow-card backdrop:bg-ink/30',
        className,
      )}
    >
      {open ? children : null}
    </dialog>
  );
}
