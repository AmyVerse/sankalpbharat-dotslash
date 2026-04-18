const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Seeding Nike supply chain data...');

  // ==================== PLANTS ====================
  const plants = await Promise.all([
    prisma.plant.create({
      data: { name: 'Nike India HQ & Distribution', city: 'Bangalore', country: 'India', business_unit: 'APAC' }
    }),
    prisma.plant.create({
      data: { name: 'Nike Sportwear Manufacturing', city: 'Chennai', country: 'India', business_unit: 'APAC' }
    }),
    prisma.plant.create({
      data: { name: 'Nike Footwear Innovation Lab', city: 'Pune', country: 'India', business_unit: 'APAC' }
    }),
  ]);

  console.log(`✅ Created ${plants.length} plants`);

  // ==================== MATERIALS ====================
  const materials = await Promise.all([
    prisma.material.create({ data: { name: 'Recycled Polyester (rPET)', category: 'Fabric', is_recycled: true, base_carbon_index: 3.2 } }),
    prisma.material.create({ data: { name: 'Virgin Polyester', category: 'Fabric', is_recycled: false, base_carbon_index: 9.5 } }),
    prisma.material.create({ data: { name: 'Organic Cotton', category: 'Fabric', is_recycled: false, base_carbon_index: 3.8 } }),
    prisma.material.create({ data: { name: 'Conventional Cotton', category: 'Fabric', is_recycled: false, base_carbon_index: 5.9 } }),
    prisma.material.create({ data: { name: 'Recycled Nylon', category: 'Fabric', is_recycled: true, base_carbon_index: 4.1 } }),
    prisma.material.create({ data: { name: 'Virgin Nylon', category: 'Fabric', is_recycled: false, base_carbon_index: 12.0 } }),
    prisma.material.create({ data: { name: 'Synthetic Leather', category: 'Material', is_recycled: false, base_carbon_index: 7.8 } }),
    prisma.material.create({ data: { name: 'Natural Leather', category: 'Material', is_recycled: false, base_carbon_index: 17.0 } }),
    prisma.material.create({ data: { name: 'Nike Air Sole Units', category: 'Component', is_recycled: false, base_carbon_index: 2.5 } }),
    prisma.material.create({ data: { name: 'Rubber Compounds', category: 'Material', is_recycled: false, base_carbon_index: 3.1 } }),
  ]);

  console.log(`✅ Created ${materials.length} materials`);

  // ==================== SUPPLIERS (Tier 1 - Direct) ====================
  const tier1Suppliers = await Promise.all([
    prisma.supplier.create({ data: { name: 'Taiwan Textiles Co.', category: 'Fabrics', country: 'Taiwan', criticality_level: 'high', tier_level: 1, active: true } }),
    prisma.supplier.create({ data: { name: 'Puma Sports India', category: 'Finished Goods', country: 'India', criticality_level: 'high', tier_level: 1, active: true } }),
    prisma.supplier.create({ data: { name: 'Shenzhou International', category: 'Apparel', country: 'China', criticality_level: 'high', tier_level: 1, active: true } }),
    prisma.supplier.create({ data: { name: 'Far Eastern New Century', category: 'Fabrics', country: 'Taiwan', criticality_level: 'high', tier_level: 1, active: true } }),
    prisma.supplier.create({ data: { name: 'Nike Vietnam Logistics', category: 'Logistics', country: 'Vietnam', criticality_level: 'medium', tier_level: 1, active: true } }),
    prisma.supplier.create({ data: { name: 'Decathlon India', category: 'Finished Goods', country: 'India', criticality_level: 'medium', tier_level: 1, active: true } }),
    prisma.supplier.create({ data: { name: 'Youngone Textiles', category: 'Apparel', country: 'Vietnam', criticality_level: 'high', tier_level: 1, active: true } }),
    prisma.supplier.create({ data: { name: 'PTA Apparel Group', category: 'Fabrics', country: 'Bangladesh', criticality_level: 'high', tier_level: 1, active: true } }),
  ]);

  // ==================== SUPPLIERS (Tier 2 - Component/Raw Materials) ====================
  const tier2Suppliers = await Promise.all([
    prisma.supplier.create({ data: { name: 'Nan Ya Plastics', category: 'Polymers', country: 'Taiwan', criticality_level: 'high', tier_level: 2, active: true } }),
    prisma.supplier.create({ data: { name: 'Indorama Ventures', category: 'Polyester', country: 'Thailand', criticality_level: 'high', tier_level: 2, active: true } }),
    prisma.supplier.create({ data: { name: 'Reliance Industries Textiles', category: 'Fabrics', country: 'India', criticality_level: 'medium', tier_level: 2, active: true } }),
    prisma.supplier.create({ data: { name: 'Adidas India Manufacturing', category: 'Apparel', country: 'India', criticality_level: 'medium', tier_level: 2, active: true } }),
    prisma.supplier.create({ data: { name: 'Jiangsu Shibo Textile', category: 'Fabrics', country: 'China', criticality_level: 'medium', tier_level: 2, active: true } }),
    prisma.supplier.create({ data: { name: 'Toray Industries', category: 'Advanced Fibers', country: 'Japan', criticality_level: 'high', tier_level: 2, active: true } }),
    prisma.supplier.create({ data: { name: 'Teijin Aramid', category: 'High-Performance Fibers', country: 'Japan', criticality_level: 'high', tier_level: 2, active: true } }),
    prisma.supplier.create({ data: { name: 'Asahi Kasei', category: 'Chemicals', country: 'Japan', criticality_level: 'medium', tier_level: 2, active: true } }),
    prisma.supplier.create({ data: { name: 'DuPont India', category: 'Polymers', country: 'India', criticality_level: 'medium', tier_level: 2, active: true } }),
    prisma.supplier.create({ data: { name: 'BASF India', category: 'Chemicals', country: 'India', criticality_level: 'high', tier_level: 2, active: true } }),
  ]);

  // ==================== SUPPLIERS (Tier 3 - Raw Materials/Chemicals) ====================
  const tier3Suppliers = await Promise.all([
    prisma.supplier.create({ data: { name: 'Sinopec Petrochemical', category: 'Chemicals', country: 'China', criticality_level: 'high', tier_level: 3, active: true } }),
    prisma.supplier.create({ data: { name: 'IOCL Refinery', category: 'Polymers', country: 'India', criticality_level: 'high', tier_level: 3, active: true } }),
    prisma.supplier.create({ data: { name: 'Lotte Chemical', category: 'Petrochemicals', country: 'South Korea', criticality_level: 'medium', tier_level: 3, active: true } }),
    prisma.supplier.create({ data: { name: 'BPCL Kochi Refinery', category: 'Chemicals', country: 'India', criticality_level: 'medium', tier_level: 3, active: true } }),
    prisma.supplier.create({ data: { name: 'Thai Oil PCL', category: 'Petrochemicals', country: 'Thailand', criticality_level: 'low', tier_level: 3, active: true } }),
    prisma.supplier.create({ data: { name: 'SK Innovation', category: 'Petrochemicals', country: 'South Korea', criticality_level: 'high', tier_level: 3, active: true } }),
    prisma.supplier.create({ data: { name: 'Hindustan Petroleum', category: 'Polymers', country: 'India', criticality_level: 'medium', tier_level: 3, active: true } }),
    prisma.supplier.create({ data: { name: 'Gail India', category: 'Petrochemicals', country: 'India', criticality_level: 'medium', tier_level: 3, active: true } }),
    prisma.supplier.create({ data: { name: 'Mitsubishi Chemical', category: 'Chemicals', country: 'Japan', criticality_level: 'high', tier_level: 3, active: true } }),
    prisma.supplier.create({ data: { name: 'Sumitomo Chemical', category: 'Petrochemicals', country: 'Japan', criticality_level: 'medium', tier_level: 3, active: true } }),
  ]);

  const allSuppliers = [...tier1Suppliers, ...tier2Suppliers, ...tier3Suppliers];
  console.log(`✅ Created ${allSuppliers.length} suppliers (T1: ${tier1Suppliers.length}, T2: ${tier2Suppliers.length}, T3: ${tier3Suppliers.length})`);

  // ==================== SUPPLY LINKS (Connect suppliers to plants) ====================
  const supplyLinks = [];

  // Tier 1 → Plants (each T1 supplier connects to 2-3 plants)
  for (const supplier of tier1Suppliers) {
    for (const plant of plants) {
      if (Math.random() > 0.3) { // 70% chance to connect
        supplyLinks.push(prisma.supplyLink.create({
          data: {
            from_supplier_id: supplier.id,
            to_plant_id: plant.id,
            material_id: materials[Math.floor(Math.random() * materials.length)].id,
            quantity: Math.floor(Math.random() * 10000) + 1000,
            unit: 'units',
            lead_time_days: Math.floor(Math.random() * 30) + 7,
          }
        }));
      }
    }
  }

  // Tier 2 → Tier 1 (each T2 supplier connects to 2-3 T1 suppliers)
  for (const t2 of tier2Suppliers) {
    const numConnections = Math.floor(Math.random() * 2) + 2; // 2-3 connections
    for (let i = 0; i < numConnections; i++) {
      const targetT1 = tier1Suppliers[Math.floor(Math.random() * tier1Suppliers.length)];
      supplyLinks.push(prisma.supplyLink.create({
        data: {
          from_supplier_id: t2.id,
          to_supplier_id: targetT1.id,
          material_id: materials[Math.floor(Math.random() * materials.length)].id,
          quantity: Math.floor(Math.random() * 50000) + 5000,
          unit: 'kg',
          lead_time_days: Math.floor(Math.random() * 45) + 14,
        }
      }));
    }
  }

  // Tier 3 → Tier 2 (each T3 supplier connects to 2-3 T2 suppliers)
  for (const t3 of tier3Suppliers) {
    const numConnections = Math.floor(Math.random() * 2) + 2; // 2-3 connections
    for (let i = 0; i < numConnections; i++) {
      const targetT2 = tier2Suppliers[Math.floor(Math.random() * tier2Suppliers.length)];
      supplyLinks.push(prisma.supplyLink.create({
        data: {
          from_supplier_id: t3.id,
          to_supplier_id: targetT2.id,
          material_id: materials[Math.floor(Math.random() * materials.length)].id,
          quantity: Math.floor(Math.random() * 100000) + 10000,
          unit: 'kg',
          lead_time_days: Math.floor(Math.random() * 60) + 21,
        }
      }));
    }
  }

  // Add some cross-tier connections for complexity
  // Some T3 → T1 direct (rare but happens in real supply chains)
  for (const t3 of tier3Suppliers.slice(0, 5)) {
    if (Math.random() > 0.5) {
      const targetT1 = tier1Suppliers[Math.floor(Math.random() * tier1Suppliers.length)];
      supplyLinks.push(prisma.supplyLink.create({
        data: {
          from_supplier_id: t3.id,
          to_supplier_id: targetT1.id,
          material_id: materials[Math.floor(Math.random() * materials.length)].id,
          quantity: Math.floor(Math.random() * 30000) + 5000,
          unit: 'kg',
          lead_time_days: Math.floor(Math.random() * 40) + 10,
        }
      }));
    }
  }

  await Promise.all(supplyLinks);
  console.log(`✅ Created ${supplyLinks.length} supply links`);

  // ==================== SUMMARY ====================
  console.log('\n📊 Nike Supply Chain Seed Summary:');
  console.log(`   Plants: ${plants.length}`);
  console.log(`   Materials: ${materials.length}`);
  console.log(`   Suppliers: ${allSuppliers.length} (T1: ${tier1Suppliers.length}, T2: ${tier2Suppliers.length}, T3: ${tier3Suppliers.length})`);
  console.log(`   Supply Links: ${supplyLinks.length}`);
  console.log('\n✅ Database seeded with Nike supply chain data!');
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());