-- CreateTable
CREATE TABLE "PricingTier" (
    "id" TEXT NOT NULL,
    "pricingId" TEXT NOT NULL,
    "minQuantity" INTEGER NOT NULL,
    "priceCents" INTEGER NOT NULL,

    CONSTRAINT "PricingTier_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PricingTier_pricingId_minQuantity_key" ON "PricingTier"("pricingId", "minQuantity");

-- AddForeignKey
ALTER TABLE "PricingTier" ADD CONSTRAINT "PricingTier_pricingId_fkey" FOREIGN KEY ("pricingId") REFERENCES "Pricing"("id") ON DELETE CASCADE ON UPDATE CASCADE;
