'use client';

import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu';
import type { ComponentPropsWithoutRef, ElementRef } from 'react';
import { forwardRef } from 'react';
import { cn } from '@/lib/utils';

/*
 * Hand-written on top of @radix-ui/react-dropdown-menu rather than pulled from
 * the shadcn registry.
 *
 * shadcn 2.10's registry serves Tailwind-v4 colour values (a v4 colour
 * function, `ring-3`, `color-mix()`) which fail silently against this app's
 * Tailwind 3.4 config — see the admin portal section of docs/engineering-decisions.md. Writing the
 * wrapper ourselves means the styling is expressed in Sahayo tokens from the
 * start, with no emitted CSS to convert afterwards.
 */

export const DropdownMenu = DropdownMenuPrimitive.Root;
export const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger;
export const DropdownMenuGroup = DropdownMenuPrimitive.Group;

export const DropdownMenuContent = forwardRef<
  ElementRef<typeof DropdownMenuPrimitive.Content>,
  ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Content>
>(function DropdownMenuContent({ className, sideOffset = 8, ...props }, ref) {
  return (
    <DropdownMenuPrimitive.Portal>
      <DropdownMenuPrimitive.Content
        ref={ref}
        sideOffset={sideOffset}
        className={cn(
          'z-50 min-w-[11rem] overflow-hidden rounded-tile border border-hairline bg-surface p-1 shadow-card',
          /* The highlighted item carries focus; a ring around the whole panel would double it. */
          'focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0',
          'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
          className,
        )}
        {...props}
      />
    </DropdownMenuPrimitive.Portal>
  );
});

export const DropdownMenuItem = forwardRef<
  ElementRef<typeof DropdownMenuPrimitive.Item>,
  ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Item>
>(function DropdownMenuItem({ className, ...props }, ref) {
  return (
    <DropdownMenuPrimitive.Item
      ref={ref}
      className={cn(
        'flex cursor-pointer select-none items-center gap-2 rounded-md px-2.5 py-2 text-table text-ink outline-none transition-colors',
        'focus:bg-marigold-tint data-[highlighted]:bg-marigold-tint',
        'data-[disabled]:pointer-events-none data-[disabled]:text-muted',
        className,
      )}
      {...props}
    />
  );
});

export const DropdownMenuLabel = forwardRef<
  ElementRef<typeof DropdownMenuPrimitive.Label>,
  ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Label>
>(function DropdownMenuLabel({ className, ...props }, ref) {
  return (
    <DropdownMenuPrimitive.Label
      ref={ref}
      className={cn('px-2.5 py-2 text-pill font-semibold text-muted', className)}
      {...props}
    />
  );
});

export const DropdownMenuSeparator = forwardRef<
  ElementRef<typeof DropdownMenuPrimitive.Separator>,
  ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Separator>
>(function DropdownMenuSeparator({ className, ...props }, ref) {
  return (
    <DropdownMenuPrimitive.Separator
      ref={ref}
      className={cn('-mx-1 my-1 h-px bg-hairline', className)}
      {...props}
    />
  );
});
