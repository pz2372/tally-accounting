import type {
  DailySalesReport as PrismaDailySalesReport,
  SalesReportSource as PrismaSalesReportSource,
  SalesReportStatus as PrismaSalesReportStatus
} from '@prisma/client';
import type Organization from './Organization';
import type User from './User';

export type SalesReportSource = PrismaSalesReportSource;
export type SalesReportStatus = PrismaSalesReportStatus;
export interface DailySalesReport extends PrismaDailySalesReport {
  org?: Organization;
  uploadedBy?: User | null;
}

export default DailySalesReport;

export type PrismaDailySalesReportType = PrismaDailySalesReport;
