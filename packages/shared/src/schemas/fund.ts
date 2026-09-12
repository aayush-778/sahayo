import { z } from 'zod';
import {
  LoanStatus,
  ProposalStatus,
  VoteDirection,
  type FundTotals,
  type LoanRequest,
  type Proposal,
  type ProposalComment,
} from '../types/fund';
import { idSchema, isoDateTimeSchema, paiseSchema } from './common';

export const proposalStatusSchema = z.nativeEnum(ProposalStatus);
export const voteDirectionSchema = z.nativeEnum(VoteDirection);
export const loanStatusSchema = z.nativeEnum(LoanStatus);

export const proposalCommentSchema = z.object({
  id: idSchema,
  authorId: idSchema,
  authorName: z.string().min(1),
  body: z.string().min(1).max(2000),
  createdAt: isoDateTimeSchema,
}) satisfies z.ZodType<ProposalComment>;

export const proposalSchema = z.object({
  id: idSchema,
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(2000),
  amountRequested: paiseSchema,
  proposerId: idSchema,
  proposerName: z.string().min(1),
  votesFor: z.number().int().nonnegative(),
  votesAgainst: z.number().int().nonnegative(),
  quorum: z.number().int().positive(),
  electorate: z.number().int().positive(),
  status: proposalStatusSchema,
  openedAt: isoDateTimeSchema,
  closesAt: isoDateTimeSchema,
  comments: z.array(proposalCommentSchema),
  outcomeNote: z.string().max(1000).optional(),
}) satisfies z.ZodType<Proposal>;

export const loanRequestSchema = z.object({
  id: idSchema,
  workerId: idSchema,
  workerName: z.string().min(1),
  amount: paiseSchema,
  purpose: z.string().min(1).max(300),
  repaymentPlan: z.string().min(1).max(200),
  repaymentMonths: z.number().int().positive(),
  lifetimeContribution: paiseSchema,
  outstanding: paiseSchema,
  status: loanStatusSchema,
  requestedAt: isoDateTimeSchema,
  decidedAt: isoDateTimeSchema.optional(),
  rejectionReason: z.string().max(500).optional(),
}) satisfies z.ZodType<LoanRequest>;

export const fundTotalsSchema = z.object({
  balance: paiseSchema,
  contributedThisMonth: paiseSchema,
  disbursedThisMonth: paiseSchema,
  memberCount: z.number().int().nonnegative(),
  lendingHeadroom: paiseSchema,
  communityGoal: paiseSchema,
}) satisfies z.ZodType<FundTotals>;
