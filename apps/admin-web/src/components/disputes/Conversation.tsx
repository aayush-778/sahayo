'use client';

import { Send, StickyNote } from 'lucide-react';
import { forwardRef, useState } from 'react';
import { DisputeAuthor, DisputeStatus, type Dispute } from '@sahayo/shared';
import { Avatar } from '@/components/ui-kit/Avatar';
import { Button } from '@/components/ui-kit/Button';
import { cn } from '@/lib/utils';

export interface ConversationProps {
  dispute: Dispute;
  workerAvatarUrl?: string;
  onSend: (body: string, internal: boolean) => Promise<void>;
}

/**
 * The thread between both parties and the administrator.
 *
 * Internal notes sit in the same thread, in their place in time, but on a marigold
 * tint with "Only admins see this" — so the reasoning behind a decision stays next to
 * the conversation it came from, and nobody mistakes a note for something the worker
 * or customer was told.
 */
export const Conversation = forwardRef<HTMLElement, ConversationProps>(function Conversation(
  { dispute, workerAvatarUrl, onSend },
  ref,
) {
  const [body, setBody] = useState('');
  const [internal, setInternal] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string>();

  const resolved = dispute.status === DisputeStatus.RESOLVED;

  async function submit(): Promise<void> {
    setSending(true);
    setError(undefined);
    try {
      await onSend(body, resolved ? true : internal);
      setBody('');
    } catch (caught) {
      setError((caught as Error).message);
    } finally {
      setSending(false);
    }
  }

  return (
    <section ref={ref} aria-label="Conversation" className="flex flex-col gap-3">
      <ol className="flex flex-col gap-3">
        {dispute.messages.map((message) => {
          const isAdmin = message.author === DisputeAuthor.ADMIN;
          const avatarSrc = message.author === DisputeAuthor.WORKER ? workerAvatarUrl : undefined;
          const role =
            message.author === DisputeAuthor.WORKER
              ? 'Worker'
              : message.author === DisputeAuthor.CUSTOMER
                ? 'Customer'
                : 'Administrator';
          return (
            <li key={message.id} className={cn('flex gap-3', isAdmin && 'flex-row-reverse')}>
              <Avatar name={message.authorName} src={avatarSrc} size={28} />
              <div
                className={cn(
                  'max-w-[78%] rounded-tile border px-3 py-2',
                  message.internal
                    ? 'border-marigold/40 bg-marigold-tint'
                    : isAdmin
                      ? 'border-hairline bg-ground'
                      : 'border-hairline bg-surface',
                )}
              >
                <p className="flex flex-wrap items-baseline gap-x-2 text-pill text-muted">
                  <span className="font-medium text-ink">{message.authorName}</span>
                  <span>{role}</span>
                  {message.internal ? (
                    <span className="inline-flex items-center gap-1 font-medium text-ink">
                      <StickyNote size={11} strokeWidth={1.75} aria-hidden />
                      Only admins see this
                    </span>
                  ) : null}
                  <span className="ml-auto">
                    {new Date(message.createdAt).toLocaleString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </p>
                <p className="mt-1 text-table text-ink">{message.body}</p>
              </div>
            </li>
          );
        })}
      </ol>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
        className={cn(
          'flex flex-col gap-2 rounded-tile border p-3',
          internal || resolved ? 'border-marigold/40 bg-marigold-tint/50' : 'border-hairline bg-surface',
        )}
      >
        <label className="sr-only" htmlFor={`reply-${dispute.id}`}>
          {internal || resolved ? 'Internal note' : 'Reply to both parties'}
        </label>
        <textarea
          id={`reply-${dispute.id}`}
          value={body}
          onChange={(event) => setBody(event.target.value)}
          rows={2}
          placeholder={
            resolved
              ? 'This ticket is resolved. Add a note for other admins.'
              : internal
                ? 'A note only other admins will see'
                : `Reply to ${dispute.customerName} and ${dispute.workerName}`
          }
          className="resize-none bg-transparent text-table text-ink placeholder:text-muted focus:outline-none"
        />
        <div className="flex flex-wrap items-center justify-between gap-2">
          <label className={cn('flex items-center gap-2 text-pill', resolved ? 'text-muted' : 'text-ink')}>
            <input
              type="checkbox"
              checked={resolved || internal}
              disabled={resolved}
              onChange={(event) => setInternal(event.target.checked)}
              className="h-4 w-4 accent-marigold"
            />
            Internal note, only admins see it
          </label>
          <Button
            type="submit"
            size="sm"
            variant={internal || resolved ? 'outline' : 'primary'}
            icon={<Send size={14} strokeWidth={1.5} aria-hidden />}
            disabled={sending || !body.trim()}
          >
            {internal || resolved ? 'Add note' : 'Send reply'}
          </Button>
        </div>
        {error ? (
          <p role="alert" className="text-pill text-ink">
            {error}
          </p>
        ) : null}
      </form>
    </section>
  );
});
