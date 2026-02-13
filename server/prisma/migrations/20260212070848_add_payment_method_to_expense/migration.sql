-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CREDIT_CARD', 'DEBIT_CARD', 'CASH');

-- AlterTable
ALTER TABLE "Expense" ADD COLUMN     "paymentMethod" "PaymentMethod" NOT NULL DEFAULT 'CREDIT_CARD';
