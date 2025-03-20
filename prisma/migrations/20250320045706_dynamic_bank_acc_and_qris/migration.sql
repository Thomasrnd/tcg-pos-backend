-- AlterTable
ALTER TABLE "PaymentMethodSetting" ADD COLUMN     "accountHolder" TEXT,
ADD COLUMN     "accountNumber" TEXT,
ADD COLUMN     "bankName" TEXT,
ADD COLUMN     "qrisImageUrl" TEXT;
