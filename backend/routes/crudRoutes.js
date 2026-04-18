const express = require('express');
const { PrismaClient } = require('@prisma/client');

// Initialize Prisma Client
const prisma = new PrismaClient();

const router = express.Router();

// Allowed Prisma models
const allowedModels = [
  'user', 'session', 'action', 'comment', 'approval', 'notification', 'auditLog',
  'plant', 'supplier', 'material', 'supplyLink', 'purchase', 'energyUsage', 
  'logistics', 'travelRecord', 'wasteRecord', 'emission',
  'supplierScore', 'dashboardSummary', 'forecastResult', 'scenarioResult', 'recommendation'
];

// Middleware to check if the requested model is allowed
const checkModel = (req, res, next) => {
  const model = req.params.model;
  if (!allowedModels.includes(model)) {
    return res.status(400).json({ error: `Model '${model}' is not supported.` });
  }
  req.prismaModel = prisma[model];
  next();
};

// ==========================================
// Generic CRUD Endpoints for Prisma Models 
// ==========================================

// Fetch ALL records for a model
router.get('/:model', checkModel, async (req, res) => {
  try {
    const data = await req.prismaModel.findMany();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Fetch a SINGLE record by ID
router.get('/:model/:id', checkModel, async (req, res) => {
  try {
    const data = await req.prismaModel.findUnique({ 
      where: { id: req.params.id } 
    });
    if (!data) return res.status(404).json({ error: 'Record not found' });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Batch Create records
router.post('/batch/:model', checkModel, async (req, res) => {
  try {
    if (!Array.isArray(req.body)) {
      return res.status(400).json({ error: 'Body must be an array of objects' });
    }
    // Use an interactive transaction or parallel creation array so IDs are returned.
    const creates = req.body.map(data => req.prismaModel.create({ data }));
    const result = await prisma.$transaction(creates);
    
    res.status(201).json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Create a new record
router.post('/:model', checkModel, async (req, res) => {
  try {
    const data = await req.prismaModel.create({ 
      data: req.body 
    });
    res.status(201).json(data);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Update an existing record
router.put('/:model/:id', checkModel, async (req, res) => {
  try {
    const data = await req.prismaModel.update({
      where: { id: req.params.id },
      data: req.body
    });
    res.json(data);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Delete a record
router.delete('/:model/:id', checkModel, async (req, res) => {
  try {
    const data = await req.prismaModel.delete({
      where: { id: req.params.id }
    });
    res.json({ message: 'Deleted successfully', data });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;