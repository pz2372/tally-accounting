import type {
  OrganizationSubscription as PrismaOrganizationSubscription,
  SubscriptionStatus as PrismaSubscriptionStatus
} from '@prisma/client';
import type Organization from './Organization';

export type SubscriptionStatus = PrismaSubscriptionStatus;
export interface OrganizationSubscription extends PrismaOrganizationSubscription {
  org?: Organization;
}

export default OrganizationSubscription;

export type PrismaOrganizationSubscriptionType = PrismaOrganizationSubscription;
