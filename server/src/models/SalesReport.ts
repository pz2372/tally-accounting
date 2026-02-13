import type {
  SalesReport as PrismaSalesReport,
  SalesReportSource as PrismaSalesReportSource,
  SalesReportStatus as PrismaSalesReportStatus
} from '@prisma/client';
import type Organization from './Organization';
import type User from './User';

export type SalesReportSource = PrismaSalesReportSource;
export type SalesReportStatus = PrismaSalesReportStatus;
export interface SalesReport extends PrismaSalesReport {
  org?: Organization;
  uploadedBy?: User | null;
}

export default SalesReport;

export type PrismaSalesReportType = PrismaSalesReport;
