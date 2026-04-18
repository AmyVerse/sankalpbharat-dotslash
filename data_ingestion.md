System Specification: Multimodal ESG Supply Chain Audit Pipeline (Nike Case Study)
1. Executive Summary

This document defines the technical blueprint for a multimodal ingestion and audit platform. The system is designed to transform high-entropy supply chain data into a structured "Shadow Carbon Ledger." It utilizes a hybrid intelligence approach: using generative AI for unstructured document extraction and a deterministic mathematical engine for carbon footprint heuristics.
2. Multimodal Data Ingestion Layer
2.1 Unstructured Processing (The "Chaos" Layer)

The platform handles raw data artifacts that typically bypass traditional ERP systems.

    Visual Ingestion (inv1.png, inv2.png): Multimodal vision models parse physical invoices to extract "Intent Data." This includes identifying handwritten signatures, verification stamps, and sustainability labels that are not present in digital records.

    Text & Documentation (RAW_INV_*.txt, nike_materials.pdf): Natural Language Processing (NLP) extracts HSN codes, material specifications (e.g., "Recycled" vs. "Virgin"), and procurement volumes.

    Communication Mining (supplier_emails.txt): Sentiment and entity extraction identify potential supply chain disruptions or logistics delays that impact the temporal accuracy of carbon reports.

2.2 Structured Data Harmonization

The system serves as a bridge between "Messy Reality" and "Master Data."

    Binary Parsing (suplier list.xls): The engine reads legacy binary formats to establish a "Source of Truth" for factory locations, worker counts, and product categories.

    Standardization Engine: Generative agents normalize inconsistent column headers across various CSV inputs (tier1_finished_goods.csv, etc.), mapping them to a unified schema for graph injection.

3. The Carbon Calculation Engine (Heuristics & Formulas)

In the absence of direct sensor telemetry (primary data), the system employs a Multi-Tier Proxy Model. This model uses workforce scale, geography, and material science as deterministic proxies for environmental impact.
3.1 Manufacturing Footprint (Emfg​)

This formula calculates the estimated energy-related carbon output of a facility based on its operational scale and regional energy mix.
Emfg​=(W×Iprod​)×Gregion​

    W (Workforce/Size): The Total Workers count from the master list, serving as the primary proxy for factory scale.

    Iprod​ (Industry Intensity): A coefficient representing energy consumption per worker-hour.

        Footwear (Heavy): 1.85 kWh/worker (High due to molding and heat presses).

        Apparel (Light): 1.10 kWh/worker (Driven by assembly and sewing).

    Gregion​ (Grid Intensity): The carbon factor of the local power grid (kgCO2​e/kWh).

        Coal-Dominant (e.g., Vietnam, China): 0.55 – 0.72

        Renewable-Heavy (e.g., Brazil, Norway): 0.10 – 0.25

3.2 Material-Based Shadow Tax (Tshadow​)

This formula calculates the "Hidden Cost" of a specific shipment based on the material intelligence extracted from invoices.
Tshadow​=(M×Cbase​)×(1−Rcirc​)×Pcarbon​

    M (Mass): The net weight extracted from the RAW_INV text or image.

    Cbase​ (Base Intensity): Scientific carbon intensity of the material (e.g., Virgin Nylon = 12.0 kgCO2​e/kg).

    Rcirc​ (Circularity Credit): A reduction coefficient triggered by sustainable keywords found in the nike_materials.pdf.

        Keyword: "Recycled Polyester" →Rcirc​=0.30

        Keyword: "Nike Forward" →Rcirc​=0.75

    Pcarbon​ (Carbon Price): The internal fiscal liability assigned per metric ton (e.g., $100/ton).

3.3 Logistics Impact (Elog​)

The "Edge" weight in the supply chain graph.
Elog​=D×Mmode​×Wtotal​

    D (Distance): Geodesic distance between the Supplier Origin and the Nike Logistics Hub.

    Mmode​ (Mode Factor): Intensity based on transit method (Air Freight >> Trucking > Ocean Freight).

4. Visualization & Frontend Strategy
4.1 Hierarchical Semantic Filtering

To maintain UI performance and clarity, the system employs an "Active State" filter.

    The Inactive "Dim": 550+ suppliers from the Excel master list are loaded into the background.

    The Audit Focus: Only nodes with associated RAW_INV or inv.png artifacts are rendered in high-fidelity on the graph. This creates a "Traceability Path" from the material origin to the finished good.

4.2 The Multimodal Drill-Down

Clicking an active node triggers a "Deep Audit" view:

    Structured Metadata: Displays factory workers, city, and geography.

    Artifact Proof: Shows the original inv.txt or inv1.png file alongside the AI-extracted fields.

    Shadow P&L: A real-time breakdown of the emissions calculated using the Section 3 formulas.

5. Agent Instructions for Implementation
5.1 Backend Developer Agent

    Ingestion: Build a Python handler for .xls (binary) and .csv (standard) that uses fuzzy string matching to link "Vendor" names across files.

    Multimodal Pipeline: Integrate a vision-language model to process inv1.png. Extract HSN codes and search for "Recycled" or "Sustainable" keywords.

    Math Engine: Implement the Emfg​ and Tshadow​ formulas as a calculation service that updates node metadata.

5.2 Frontend Developer Agent

    Graph Engine: Use React Flow or D3 to build the network. Implement a filter to only show nodes with active invoices.

    Interaction: Create a "Circular Optimization" toggle. When enabled, recalculate the graph's total shadow tax assuming all "Virgin" materials are swapped for "Recycled" alternatives.

    State Management: Sync the "Audit Feed" (the list of 40 invoices) with the map coordinates.