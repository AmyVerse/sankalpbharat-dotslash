require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });
const rawSql = `
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
TRUNCATE TABLE "AuditLog","Approval","Comment","Action","Recommendation","ScenarioResult","ForecastResult","DashboardSummary","SupplierScore","Emission","WasteRecord","Logistics","EnergyUsage","Purchase","Supplier","Plant","User" RESTART IDENTITY CASCADE;
INSERT INTO "User" (id,name,email,password_hash,role,department,created_at)
SELECT gen_random_uuid(), 'User '||g, 'user'||g||'@company.com','hash','manager','dept'||(g%5), NOW() - (g||' days')::interval FROM generate_series(1,50) g;
INSERT INTO "Plant" (id,name,city,country,business_unit)
SELECT gen_random_uuid(), 'Plant '||g, (ARRAY['Pune','Mumbai','Bangalore','Chennai','Delhi'])[1+((g-1)%5)], 'India', (ARRAY['Manufacturing','Packaging','Assembly'])[1+((g-1)%3)] FROM generate_series(1,10) g;
INSERT INTO "Supplier" (id,name,category,country,criticality_level,sole_source,active)
SELECT gen_random_uuid(), 'Supplier '||g, (ARRAY['Steel','Packaging','Transport','Chemicals','Electronics'])[1+((g-1)%5)], (ARRAY['India','Germany','China','USA','UAE'])[1+((g-1)%5)], (ARRAY['low','medium','high'])[1+((g-1)%3)], (g%7=0), true FROM generate_series(1,100) g;
INSERT INTO "Purchase" (id,supplier_id,plant_id,material_name,quantity,unit,amount,purchase_date)
SELECT gen_random_uuid(), s.id, p.id, 'Material '||gs, (random()*500)::int+1, 'ton', round((random()*500000+10000)::numeric,2), date '2024-01-01'+((gs%900))
FROM generate_series(1,2000) gs CROSS JOIN LATERAL (SELECT id FROM "Supplier" ORDER BY random() LIMIT 1) s CROSS JOIN LATERAL (SELECT id FROM "Plant" ORDER BY random() LIMIT 1) p;
INSERT INTO "EnergyUsage" (id,plant_id,source_type,quantity,unit,cost,usage_date)
SELECT gen_random_uuid(), p.id, src, qty, unitv, round((qty*(random()*8+2))::numeric,2), dt FROM generate_series(1,2000) gs CROSS JOIN LATERAL (SELECT id FROM "Plant" ORDER BY random() LIMIT 1) p CROSS JOIN LATERAL (SELECT (ARRAY['electricity','diesel','solar'])[1+floor(random()*3)]::text src, (random()*10000+100)::int qty, CASE WHEN random()<0.33 THEN 'liters' ELSE 'kwh' END unitv, date '2024-01-01'+((gs%900)) dt) z;
INSERT INTO "Logistics" (id,supplier_id,plant_id,mode,distance_km,weight_ton,cost,shipment_date)
SELECT gen_random_uuid(), s.id,p.id,(ARRAY['truck','rail','ship'])[1+floor(random()*3)],(random()*5000+50)::int,(random()*100+1)::int,round((random()*200000+5000)::numeric,2),date '2024-01-01'+((gs%900)) FROM generate_series(1,1500) gs CROSS JOIN LATERAL (SELECT id FROM "Supplier" ORDER BY random() LIMIT 1) s CROSS JOIN LATERAL (SELECT id FROM "Plant" ORDER BY random() LIMIT 1) p;
INSERT INTO "WasteRecord" (id,plant_id,waste_type,quantity,disposal_method,record_date)
SELECT gen_random_uuid(), p.id,(ARRAY['metal_scrap','plastic_waste','organic'])[1+floor(random()*3)],(random()*100)::int+1,(ARRAY['recycle','landfill'])[1+floor(random()*2)],date '2024-01-01'+((gs%900)) FROM generate_series(1,1200) gs CROSS JOIN LATERAL (SELECT id FROM "Plant" ORDER BY random() LIMIT 1) p;
INSERT INTO "Emission" (id,source_type,source_id,scope,category,co2e,confidence_score,method,record_date)
SELECT gen_random_uuid(),'purchase',id,3,'purchased_goods',round((random()*200)::numeric,2),(random()*40+60)::int,'factor',purchase_date FROM "Purchase";
INSERT INTO "SupplierScore" (id,supplier_id,dependency_score,emission_score,cost_score,risk_score,recommended_action,updated_at)
SELECT gen_random_uuid(),id,(random()*100)::int,(random()*100)::int,(random()*100)::int,(random()*100)::int,'Review sourcing mix',NOW() FROM "Supplier";
INSERT INTO "DashboardSummary" (id,period,total_emissions,scope1,scope2,scope3,total_cost,target_progress,updated_at)
SELECT gen_random_uuid(), to_char(date '2024-01-01'+(g*30),'YYYY-MM'), round((random()*1000)::numeric,2), round((random()*300)::numeric,2), round((random()*300)::numeric,2), round((random()*500)::numeric,2), round((random()*900000+100000)::numeric,2), (random()*100)::int, NOW() FROM generate_series(0,35) g;
INSERT INTO "ForecastResult" (id,metric_name,period,predicted_value,confidence,created_at)
SELECT gen_random_uuid(), m, to_char(date '2027-01-01'+(g*30),'YYYY-MM'), round((random()*1000)::numeric,2), round((random()*0.3+0.7)::numeric,2), NOW() FROM generate_series(0,11) g, (VALUES ('total_emissions'),('energy_cost'),('profit')) t(m);
INSERT INTO "ScenarioResult" (id,scenario_name,input_json,emission_change,cost_change,risk_change,created_by,created_at)
SELECT gen_random_uuid(),'Scenario '||g, jsonb_build_object('case',g), round((random()*40-20)::numeric,2), round((random()*20-10)::numeric,2), round((random()*10-5)::numeric,2), u.id, NOW() FROM generate_series(1,120) g CROSS JOIN LATERAL (SELECT id FROM "User" ORDER BY random() LIMIT 1) u;
INSERT INTO "Recommendation" (id,title,explanation,priority,related_entity_type,related_entity_id,status,created_at)
SELECT gen_random_uuid(),'Recommendation '||g,'Generated recommendation', (ARRAY['low','medium','high'])[1+((g-1)%3)], 'plant', p.id, 'open', NOW() FROM generate_series(1,150) g CROSS JOIN LATERAL (SELECT id FROM "Plant" ORDER BY random() LIMIT 1) p;
INSERT INTO "Action" (id,title,description,type,status,owner_user_id,priority,expected_emission_reduction,expected_cost_impact,due_date,created_at)
SELECT gen_random_uuid(),'Action '||g,'Generated action','ops',(ARRAY['open','under_review','done'])[1+((g-1)%3)],u.id,(ARRAY['low','medium','high'])[1+((g-1)%3)],round((random()*20)::numeric,2),round((random()*20-10)::numeric,2),CURRENT_DATE+g,NOW() FROM generate_series(1,150) g CROSS JOIN LATERAL (SELECT id FROM "User" ORDER BY random() LIMIT 1) u;
INSERT INTO "Comment" (id,action_id,user_id,message,created_at)
SELECT gen_random_uuid(), a.id,u.id,'Auto comment',NOW() FROM generate_series(1,250) g CROSS JOIN LATERAL (SELECT id FROM "Action" ORDER BY random() LIMIT 1) a CROSS JOIN LATERAL (SELECT id FROM "User" ORDER BY random() LIMIT 1) u;
INSERT INTO "Approval" (id,action_id,user_id,decision,note,created_at)
SELECT gen_random_uuid(), a.id,u.id,(ARRAY['approved','rejected','pending'])[1+floor(random()*3)],'Auto review',NOW() FROM generate_series(1,180) g CROSS JOIN LATERAL (SELECT id FROM "Action" ORDER BY random() LIMIT 1) a CROSS JOIN LATERAL (SELECT id FROM "User" ORDER BY random() LIMIT 1) u;
INSERT INTO "AuditLog" (id,user_id,entity_type,entity_id,action,metadata,created_at)
SELECT gen_random_uuid(), u.id, (ARRAY['plant','supplier','emission'])[1+floor(random()*3)], gen_random_uuid(), (ARRAY['Created Registry Node','Updated Carbon Factor','Sanctioned Audit Override','Flagged Anomaly'])[1+floor(random()*4)], '{"ip": "192.168.1.1"}'::jsonb, NOW() - (g||' hours')::interval FROM generate_series(1,100) g CROSS JOIN LATERAL (SELECT id FROM "User" ORDER BY random() LIMIT 1) u;
`;
async function main() { try { console.log('Seeding...'); await prisma.$executeRawUnsafe(rawSql); console.log('Done'); } catch (e) { console.error(e) } finally { await prisma.$disconnect(); await pool.end(); } } main();