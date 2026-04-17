-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "department" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Action" (
    "id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "owner_user_id" UUID NOT NULL,
    "priority" TEXT NOT NULL,
    "expected_emission_reduction" DECIMAL(65,30),
    "expected_cost_impact" DECIMAL(65,30),
    "due_date" DATE,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Action_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Comment" (
    "id" UUID NOT NULL,
    "action_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "message" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Comment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Approval" (
    "id" UUID NOT NULL,
    "action_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "decision" TEXT NOT NULL,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Approval_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" UUID NOT NULL,
    "action" TEXT NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Plant" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "business_unit" TEXT,

    CONSTRAINT "Plant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Supplier" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "country" TEXT,
    "criticality_level" TEXT,
    "sole_source" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "tier_level" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "Supplier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Material" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "is_recycled" BOOLEAN NOT NULL DEFAULT false,
    "base_carbon_index" DECIMAL(65,30) NOT NULL,

    CONSTRAINT "Material_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplyLink" (
    "id" UUID NOT NULL,
    "from_supplier_id" UUID,
    "from_plant_id" UUID,
    "to_supplier_id" UUID,
    "to_plant_id" UUID,
    "material_id" UUID NOT NULL,
    "quantity" DECIMAL(65,30) NOT NULL,
    "unit" TEXT NOT NULL,
    "lead_time_days" INTEGER,
    "logistics_id" UUID,

    CONSTRAINT "SupplyLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Purchase" (
    "id" UUID NOT NULL,
    "supplier_id" UUID NOT NULL,
    "plant_id" UUID NOT NULL,
    "material_name" TEXT NOT NULL,
    "quantity" DECIMAL(65,30) NOT NULL,
    "unit" TEXT NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "purchase_date" DATE NOT NULL,

    CONSTRAINT "Purchase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EnergyUsage" (
    "id" UUID NOT NULL,
    "plant_id" UUID NOT NULL,
    "source_type" TEXT NOT NULL,
    "quantity" DECIMAL(65,30) NOT NULL,
    "unit" TEXT NOT NULL,
    "cost" DECIMAL(65,30) NOT NULL,
    "usage_date" DATE NOT NULL,

    CONSTRAINT "EnergyUsage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Logistics" (
    "id" UUID NOT NULL,
    "supplier_id" UUID NOT NULL,
    "plant_id" UUID NOT NULL,
    "mode" TEXT NOT NULL,
    "distance_km" DECIMAL(65,30) NOT NULL,
    "weight_ton" DECIMAL(65,30) NOT NULL,
    "cost" DECIMAL(65,30) NOT NULL,
    "shipment_date" DATE NOT NULL,

    CONSTRAINT "Logistics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TravelRecord" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "mode" TEXT NOT NULL,
    "distance_km" DECIMAL(65,30) NOT NULL,
    "class" TEXT,
    "travel_date" DATE NOT NULL,
    "cost" DECIMAL(65,30),

    CONSTRAINT "TravelRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WasteRecord" (
    "id" UUID NOT NULL,
    "plant_id" UUID NOT NULL,
    "material_id" UUID,
    "waste_type" TEXT NOT NULL,
    "quantity" DECIMAL(65,30) NOT NULL,
    "disposal_method" TEXT NOT NULL,
    "record_date" DATE NOT NULL,

    CONSTRAINT "WasteRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Emission" (
    "id" UUID NOT NULL,
    "source_type" TEXT NOT NULL,
    "source_id" UUID NOT NULL,
    "scope" INTEGER NOT NULL,
    "category" TEXT,
    "co2e" DECIMAL(65,30) NOT NULL,
    "confidence_score" DECIMAL(65,30),
    "method" TEXT,
    "record_date" DATE NOT NULL,

    CONSTRAINT "Emission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplierScore" (
    "id" UUID NOT NULL,
    "supplier_id" UUID NOT NULL,
    "dependency_score" DECIMAL(65,30),
    "emission_score" DECIMAL(65,30),
    "cost_score" DECIMAL(65,30),
    "risk_score" DECIMAL(65,30),
    "recommended_action" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupplierScore_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DashboardSummary" (
    "id" UUID NOT NULL,
    "period" TEXT NOT NULL,
    "total_emissions" DECIMAL(65,30) NOT NULL,
    "scope1" DECIMAL(65,30),
    "scope2" DECIMAL(65,30),
    "scope3" DECIMAL(65,30),
    "total_cost" DECIMAL(65,30) NOT NULL,
    "target_progress" DECIMAL(65,30),
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DashboardSummary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ForecastResult" (
    "id" UUID NOT NULL,
    "metric_name" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "predicted_value" DECIMAL(65,30) NOT NULL,
    "confidence" DECIMAL(65,30),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ForecastResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScenarioResult" (
    "id" UUID NOT NULL,
    "scenario_name" TEXT NOT NULL,
    "input_json" JSONB NOT NULL,
    "emission_change" DECIMAL(65,30),
    "cost_change" DECIMAL(65,30),
    "risk_change" DECIMAL(65,30),
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScenarioResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Recommendation" (
    "id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "explanation" TEXT,
    "priority" TEXT,
    "related_entity_type" TEXT,
    "related_entity_id" UUID,
    "status" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Recommendation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "SupplyLink_logistics_id_key" ON "SupplyLink"("logistics_id");

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Action" ADD CONSTRAINT "Action_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_action_id_fkey" FOREIGN KEY ("action_id") REFERENCES "Action"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Approval" ADD CONSTRAINT "Approval_action_id_fkey" FOREIGN KEY ("action_id") REFERENCES "Action"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Approval" ADD CONSTRAINT "Approval_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplyLink" ADD CONSTRAINT "SupplyLink_from_supplier_id_fkey" FOREIGN KEY ("from_supplier_id") REFERENCES "Supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplyLink" ADD CONSTRAINT "SupplyLink_from_plant_id_fkey" FOREIGN KEY ("from_plant_id") REFERENCES "Plant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplyLink" ADD CONSTRAINT "SupplyLink_to_supplier_id_fkey" FOREIGN KEY ("to_supplier_id") REFERENCES "Supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplyLink" ADD CONSTRAINT "SupplyLink_to_plant_id_fkey" FOREIGN KEY ("to_plant_id") REFERENCES "Plant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplyLink" ADD CONSTRAINT "SupplyLink_material_id_fkey" FOREIGN KEY ("material_id") REFERENCES "Material"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplyLink" ADD CONSTRAINT "SupplyLink_logistics_id_fkey" FOREIGN KEY ("logistics_id") REFERENCES "Logistics"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Purchase" ADD CONSTRAINT "Purchase_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "Supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Purchase" ADD CONSTRAINT "Purchase_plant_id_fkey" FOREIGN KEY ("plant_id") REFERENCES "Plant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnergyUsage" ADD CONSTRAINT "EnergyUsage_plant_id_fkey" FOREIGN KEY ("plant_id") REFERENCES "Plant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Logistics" ADD CONSTRAINT "Logistics_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "Supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Logistics" ADD CONSTRAINT "Logistics_plant_id_fkey" FOREIGN KEY ("plant_id") REFERENCES "Plant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TravelRecord" ADD CONSTRAINT "TravelRecord_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WasteRecord" ADD CONSTRAINT "WasteRecord_plant_id_fkey" FOREIGN KEY ("plant_id") REFERENCES "Plant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WasteRecord" ADD CONSTRAINT "WasteRecord_material_id_fkey" FOREIGN KEY ("material_id") REFERENCES "Material"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierScore" ADD CONSTRAINT "SupplierScore_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "Supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScenarioResult" ADD CONSTRAINT "ScenarioResult_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
