const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Deleting all data...');
  
  // Delete in order to respect foreign keys
  await prisma.auditLog.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.approval.deleteMany();
  await prisma.action.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.session.deleteMany();
  await prisma.travelRecord.deleteMany();
  await prisma.scenarioResult.deleteMany();
  await prisma.recommendation.deleteMany();
  await prisma.forecastResult.deleteMany();
  await prisma.dashboardSummary.deleteMany();
  await prisma.supplierScore.deleteMany();
  await prisma.emission.deleteMany();
  await prisma.wasteRecord.deleteMany();
  await prisma.logistics.deleteMany();
  await prisma.energyUsage.deleteMany();
  await prisma.purchase.deleteMany();
  await prisma.supplyLink.deleteMany();
  await prisma.material.deleteMany();
  await prisma.supplier.deleteMany();
  await prisma.plant.deleteMany();
  await prisma.user.deleteMany();
  
  console.log('✅ All data deleted successfully!');
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());