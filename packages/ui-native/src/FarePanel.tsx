import type { ReactNode } from 'react';
import { View } from 'react-native';

import type { AppLocale } from './format';
import { formatPaise } from './format';
import { Text } from './Text';

/**
 * The fare breakdown, shared by every screen that quotes a price.
 *
 * ALL LABELS ARRIVE ALREADY TRANSLATED. `packages/ui-native` is consumed by
 * two apps and must not depend on either one's i18next instance — the same
 * reason `PrimaryButton` takes a `label` rather than a key. The caller owns
 * the words; this owns the layout, the colours and the arithmetic-free
 * rendering of paise.
 *
 * Amounts are `number`, not `Paise`, because ui-native does not depend on
 * @sahayo/shared either. They are still integer paise and are still formatted
 * only here, through `formatPaise`.
 *
 * WHY ROWS ARE DATA AND NOT CHILDREN. The panel has to express a subtlety:
 * the platform fee and the cooperative fund are shares taken OUT of the item
 * total, not added to it, so they are indented under a caption and must not
 * look like they belong to the running sum. Passing rows as a list lets each
 * screen state that structure explicitly, and keeps the tone-to-colour
 * mapping in one place instead of re-derived per screen.
 */

export type FareRowTone = 'default' | 'muted' | 'fund';

export type FareRow =
  | {
      kind: 'amount';
      key: string;
      /** Already translated. */
      label: string;
      /** Integer paise. */
      amount: number;
      tone?: FareRowTone;
      indented?: boolean;
      /** Shown before the label — pass an icon element, never an icon name. */
      icon?: ReactNode;
    }
  | { kind: 'caption'; key: string; label: string }
  | { kind: 'divider'; key: string; strong?: boolean };

export interface FarePanelProps {
  /** Already translated. */
  title: string;
  rows: FareRow[];
  totalLabel: string;
  /** Integer paise. */
  totalAmount: number;
  locale: AppLocale;
  className?: string;
}

const LABEL_TONE: Record<FareRowTone, string> = {
  default: 'text-brand-navy',
  muted: 'text-brand-muted',
  fund: 'text-brand-success',
};

const AMOUNT_TONE: Record<FareRowTone, string> = {
  default: 'text-brand-navy',
  muted: 'text-brand-muted',
  fund: 'text-brand-success',
};

const AMOUNT_WEIGHT = {
  default: 'medium',
  muted: 'regular',
  fund: 'semibold',
} as const;

export function FarePanel({
  title,
  rows,
  totalLabel,
  totalAmount,
  locale,
  className = '',
}: FarePanelProps) {
  return (
    <View
      className={`rounded-2xl border border-brand-border bg-brand-surface p-4 ${className}`}
    >
      <Text weight="bold" className="text-base text-brand-navy">
        {title}
      </Text>

      <View className="mt-2">
        {rows.map((row) => {
          if (row.kind === 'divider') {
            return (
              <View
                key={row.key}
                className={`my-1 h-px ${row.strong ? 'bg-brand-navy/20' : 'bg-brand-border'}`}
              />
            );
          }

          if (row.kind === 'caption') {
            return (
              <Text key={row.key} className="mt-2 text-xs uppercase text-brand-muted">
                {row.label}
              </Text>
            );
          }

          const tone = row.tone ?? 'default';

          return (
            <View
              key={row.key}
              className={`flex-row items-center justify-between py-1.5 ${
                row.indented ? 'pl-3' : ''
              }`}
            >
              <View className="flex-1 flex-row items-center">
                {row.icon}
                <Text
                  weight={tone === 'fund' ? 'medium' : 'regular'}
                  className={`flex-1 text-sm ${row.icon ? 'ml-1.5' : ''} ${LABEL_TONE[tone]}`}
                >
                  {row.label}
                </Text>
              </View>
              <Text
                weight={AMOUNT_WEIGHT[tone]}
                className={`ml-3 text-sm ${AMOUNT_TONE[tone]}`}
              >
                {formatPaise(row.amount, locale)}
              </Text>
            </View>
          );
        })}

        <View className="mt-1 h-px bg-brand-navy/20" />

        <View className="flex-row items-center justify-between pt-2">
          <Text weight="bold" className="flex-1 text-base text-brand-navy">
            {totalLabel}
          </Text>
          <Text weight="bold" className="ml-3 text-xl text-brand-navy">
            {formatPaise(totalAmount, locale)}
          </Text>
        </View>
      </View>
    </View>
  );
}

export interface FundHighlightProps {
  /** Integer paise routed to the cooperative fund by this booking. */
  amount: number;
  /** Already translated. Sits under the amount, e.g. "goes to the community fund". */
  title: string;
  /** Already translated. The explanatory strip along the bottom. */
  body: string;
  locale: AppLocale;
  /** An icon element. ui-native carries no icon dependency of its own. */
  icon?: ReactNode;
  className?: string;
}

/**
 * The cooperative fund, stated loudly.
 *
 * This is the one element the Ministry of Cooperation evaluators are looking
 * for, so the amount is set in display type on a solid ground rather than
 * appearing as a grey line in a fee table — the brief was "legible at arm's
 * length on a projector", and body text on a tinted card is not.
 *
 * Solid `brand-success` rather than the brand green: this is the only message
 * on the screen about collective ownership, and it should not read as one
 * more row of the same fee table it sits under.
 */
export function FundHighlight({
  amount,
  title,
  body,
  locale,
  icon,
  className = '',
}: FundHighlightProps) {
  return (
    <View className={`overflow-hidden rounded-2xl bg-brand-success ${className}`}>
      <View className="flex-row items-center p-4">
        {icon ? (
          <View className="h-12 w-12 items-center justify-center rounded-full bg-white/20">
            {icon}
          </View>
        ) : null}
        <View className={`flex-1 ${icon ? 'ml-3' : ''}`}>
          <Text weight="bold" className="text-3xl text-white">
            {formatPaise(amount, locale)}
          </Text>
          <Text weight="semibold" className="text-sm text-white">
            {title}
          </Text>
        </View>
      </View>
      <View className="bg-black/10 px-4 py-2.5">
        <Text className="text-xs text-white">{body}</Text>
      </View>
    </View>
  );
}
