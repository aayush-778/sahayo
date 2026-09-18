import { DEFAULT_EQUITY_WEIGHTS, type EquityWeights } from '@sahayo/shared';
import type { RankedCandidate } from './ranking';

/**
 * The dispatch console: every decision the dispatcher makes, printed so a person can
 * read it at a glance while narrating the demo.
 *
 *   ━━ DISPATCH  BKG-12001 · Basic Electrical Work · Rajendra Nagar · ₹349 ━━━━━━━ 16:02:11
 *   round 1   5.0 km radius · 7 available electricians found
 *
 *    #  worker                 dist     proximity     rating      fewer jobs     score
 *    1  Suresh Yadav      app  0.4 km   0.92 × .30  + 0.50 × .25 + 0.89 × .45  =  0.80  → offered
 *    2  Ramesh Kumar           1.3 km   0.74 × .30  + 0.36 × .25 + 0.42 × .45  =  0.50  → offered
 *
 *   offered   5 workers at once · 2 with the app open · answer within 30 s
 *   ✔ ACCEPTED  Suresh Yadav (rank 1) after 4,812 ms · 4 others told it is taken
 *
 * "app" marks a worker whose phone is connected; the others are seeded members the
 * offer is recorded against but who have no app to receive it.
 */

export interface DispatchLogger {
  header(details: { reference: string; service: string; locality: string; fare: number; at: Date }): void;
  round(details: { round: number; radiusM: number; trade: string; ranked: RankedCandidate[]; offeredIds: Set<string>; connected: (workerId: string) => boolean; timeoutMs: number; slotAt?: Date }): void;
  line(kind: 'accepted' | 'declined' | 'refused' | 'timeout' | 'expired' | 'cancelled' | 'note', text: string): void;
}

const useColour = process.stdout.isTTY && !process.env.NO_COLOR;
const paint = (code: string) => (text: string) => (useColour ? `\x1b[${code}m${text}\x1b[0m` : text);
const bold = paint('1');
const dim = paint('2');
const green = paint('32');
const yellow = paint('33');
const red = paint('31');
const cyan = paint('36');

const pad = (text: string, width: number): string => (text.length >= width ? text.slice(0, width) : text + ' '.repeat(width - text.length));
const padStart = (text: string, width: number): string => (text.length >= width ? text : ' '.repeat(width - text.length) + text);
const fixed = (value: number, digits = 2): string => value.toFixed(digits);
const weight = (value: number): string => fixed(value, 2).replace(/^0/, '');
const km = (metres: number): string => `${(metres / 1000).toFixed(1)} km`;
const rupees = (paise: number): string => `₹${Math.round(paise / 100).toLocaleString('en-IN')}`;

export function createPrettyLogger(weights: EquityWeights = DEFAULT_EQUITY_WEIGHTS, write: (line: string) => void = console.log): DispatchLogger {
  return {
    header({ reference, service, locality, fare, at }) {
      const title = ` DISPATCH  ${reference} · ${service} · ${locality} · ${rupees(fare)} `;
      const time = at.toLocaleTimeString('en-GB', { hour12: false });
      const rule = '━'.repeat(Math.max(4, 92 - title.length - time.length));
      write('');
      write(bold(cyan(`━━${title}${rule} ${time}`)));
    },

    round({ round, radiusM, trade, ranked, offeredIds, connected, timeoutMs, slotAt }) {
      write(`${bold(slotAt ? 'scheduled' : `round ${round}`)}   ${km(radiusM)} radius · ${ranked.length} ${slotAt ? 'verified' : 'available'} ${trade.toLowerCase()}${ranked.length === 1 ? '' : 's'} found`);
      if (ranked.length === 0) return;
      write('');
      write(
        dim(
          `  ${padStart('#', 2)}  ${pad('worker', 22)} ${pad('', 3)}  ${padStart('dist', 7)}   ${pad('proximity', 11)}   ${pad('rating', 11)}   ${pad('fewer jobs', 11)}    score`,
        ),
      );
      for (const candidate of ranked.slice(0, 10)) {
        const offered = offeredIds.has(candidate.worker.id);
        const term = (value: number, w: number) => `${fixed(value)} × ${weight(w)}`;
        const row =
          `  ${padStart(String(candidate.rank), 2)}  ${pad(candidate.worker.name, 22)} ${connected(candidate.worker.id) ? green('app') : '   '}  ` +
          `${padStart(km(candidate.distanceM), 7)}   ${term(candidate.inputs.proximity, weights.proximity)} + ${term(candidate.inputs.rating, weights.rating)} + ` +
          `${term(candidate.inputs.inverseAllocation, weights.inverseAllocation)}  =  ${bold(fixed(candidate.score))}` +
          `   ${dim(`${candidate.worker.jobsThisWeek} jobs this week, ${candidate.worker.rating.toFixed(1)}★`)}`;
        write(offered ? `${row}  ${yellow('→ offered')}` : dim(row));
      }
      if (ranked.length > 10) write(dim(`  … and ${ranked.length - 10} more below the offer line`));
      const withApp = [...offeredIds].filter((id) => connected(id)).length;
      write('');
      write(`${bold('offered')}   ${offeredIds.size} worker${offeredIds.size === 1 ? '' : 's'} at once · ${withApp} with the app open · ${slotAt ? `open until the slot, ${slotAt.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' })}` : `answer within ${Math.round(timeoutMs / 1000)} s`}`);
    },

    line(kind, text) {
      const label = {
        accepted: green(bold('✔ ACCEPTED ')),
        declined: yellow('✗ declined '),
        refused: dim('· refused  '),
        timeout: yellow('⏱ timeout  '),
        expired: red(bold('✗ EXPIRED  ')),
        cancelled: red('✗ cancelled'),
        note: dim('·          '),
      }[kind];
      write(`${label} ${text}`);
    },
  };
}

export const quietLogger: DispatchLogger = {
  header() {},
  round() {},
  line() {},
};
