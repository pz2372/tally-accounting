import type {
  RecurringCharge as PrismaRecurringCharge,
  RecurringChargeStatus as PrismaRecurringChargeStatus
} from '@prisma/client';
import type Organization from './Organization';
import type RecurringChargeInstance from './RecurringChargeInstance';

export type RecurringChargeStatus = PrismaRecurringChargeStatus;
export interface RecurringCharge extends PrismaRecurringCharge {
  org?: Organization;
  instances?: RecurringChargeInstance[];
}

export default RecurringCharge;

export type PrismaRecurringChargeType = PrismaRecurringCharge;
