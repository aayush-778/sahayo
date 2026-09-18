import { Router } from 'express';
import { voteRequestSchema, type CoopFundSummary } from '@sahayo/shared';
import { HttpError, notFound, parse, route } from '../lib/http';
import * as ledger from '../repositories/ledger';
import * as proposals from '../repositories/proposals';
import * as workers from '../repositories/workers';

export function coopRouter(): Router {
  const router = Router();

  /** GET /coop/fund — the fund's balance, its ledger summarised by month, and every proposal. */
  router.get(
    '/fund',
    route((_req, res) => {
      const result: CoopFundSummary = {
        balance: ledger.coopFundTotal(),
        memberCount: workers.list().length,
        ledger: ledger.fundLedgerByMonth(),
        proposals: proposals.list(),
      };
      res.json(result);
    }),
  );

  /** POST /coop/proposals/:id/vote — one member, one vote, while the vote is open. */
  router.post(
    '/proposals/:id/vote',
    route((req, res) => {
      const { workerId, direction } = parse(voteRequestSchema, req.body);
      if (!workers.findById(workerId)) throw notFound('worker', workerId);
      const outcome = proposals.vote(req.params.id!, workerId, direction);
      if (outcome === 'NOT_FOUND') throw notFound('proposal', req.params.id!);
      if (outcome === 'CLOSED') throw new HttpError(409, 'VOTING_CLOSED', 'Voting on this proposal has closed. Its result is final.');
      if (outcome === 'ALREADY_VOTED') throw new HttpError(409, 'ALREADY_VOTED', 'This member has already voted on this proposal. Each member votes once.');
      res.json(outcome);
    }),
  );

  return router;
}
