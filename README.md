## Team Details
- **Team Name:** DotSlash
- **Team ID:** SKB-F15
- **Members:** 
  - *Amulya Yadav (Leader)*
  - *Sambodhi Bhowal*
  - *Om Vatsal*
  - *Lokesh Chaudhari*

## Problem Statement (SKB-P1)
### Digital Intelligent Platform for ESG Performance and GHG Monitoring

**Domain:** Sustainability, ESG, Climate Tech, Data Analytics

The current corporate landscape lacks a unified Environmental, Social, and Governance (ESG) data system, leading to fragmented and manual Greenhouse Gas (GHG) emissions reporting. Without a reliable single source of truth, organizations face inconsistencies, audit challenges, and reduced productivity.

**Our Solution:** Our solution is an active ESG operating system that automates sustainability. It captures real-time emissions data from factories and small suppliers via automated bots to ensure audit-ready compliance. The platform doesn't just track data; it actively reduces footprints by optimizing energy use and supply chain resilience to maximize green ROI.

## Project Structure

```text
project-root/
│
├── frontend/          # React / PWAs
│
├── backend/           # Main Node.js server
│
├── services/          # Microservices
│   ├── python-api/
│   └── whatsapp-api/
│
│           
├── .gitignore         # docs
└── README.md         
```

## Carbon Tax Recommendations

### Upcoming Regulatory Frameworks

#### 1. EU Carbon Border Adjustment Mechanism (CBAM)
- **Effective:** Full implementation by 2026
- **Impact:** Imports of carbon-intensive goods (steel, aluminum, cement, fertilizers, hydrogen, electricity) into the EU face carbon tariffs based on embedded emissions
- **Our Approach:** Track supply chain emissions via `SupplyLink` to calculate inherited carbon and pre-compute CBAM exposure per material

#### 2. India Carbon Tax (PLI & ESG Mandates)
- **Status:** India is developing its own carbon pricing framework with production-linked incentive (PLI) schemes favoring low-carbon manufacturers
- **Expected:** Carbon tax on fossil fuel emissions, ESG disclosure mandates for listed companies
- **Our Approach:** Use `base_carbon_index` on Materials + logistics CO2e to estimate tax liability and optimize supplier selection

### Implementation in Platform

| Feature | Description |
|---------|-------------|
| **Shadow P&L** | `SupplyLink.internal_carbon_tax_impact` accumulates tax across tiers |
| **Hotspot Visualization** | Color nodes by total upstream emissions (red = high tax exposure) |
| **What-If Scenarios** | Compare virgin vs. recycled material paths for tax savings |
| **Supplier Tiering** | Flag Tier-2/Tier-3 suppliers with high `base_carbon_index` |

### Tax Rate References (2026 Estimates)

| Region | Rate | Applied To |
|--------|------|------------|
| EU CBAM | €80-100 / ton CO2e | Importers of carbon-intensive goods |
| India (proposed) | ₹50-100 / ton CO2e | Fossil fuel combustion, industrial emissions |