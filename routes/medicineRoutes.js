const express = require('express');
const router = express.Router();
const Medicine = require('../models/Medicine');
const { requireAdmin } = require('../middleware/authMiddleware');

// Helper to determine status and days remaining
function computeMedicineStatus(medicineDoc) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const expDate = new Date(medicineDoc.expiryDate);
  expDate.setHours(0, 0, 0, 0);

  const diffTime = expDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  let status = 'SAFE';
  let badgeColor = 'success';
  let alertMessage = 'Medicine is in valid usable condition';

  if (diffDays < 0) {
    status = 'EXPIRED';
    badgeColor = 'danger';
    alertMessage = `Expired ${Math.abs(diffDays)} day(s) ago! Immediate removal/quarantine required.`;
  } else if (diffDays <= 30) {
    status = 'EXPIRING_SOON';
    badgeColor = 'warning';
    alertMessage = `Expiring soon in ${diffDays} day(s). Prioritize dispensing or return to vendor.`;
  }

  const plain = medicineDoc.toObject ? medicineDoc.toObject() : { ...medicineDoc };
  return {
    ...plain,
    status,
    badgeColor,
    daysRemaining: diffDays,
    alertMessage,
    isLowStock: plain.quantity <= 10,
  };
}

// GET /api/medicines/stats/summary - Dashboard Summary
router.get('/stats/summary', async (req, res) => {
  try {
    const medicines = await Medicine.find().sort({ expiryDate: 1 });
    const computed = medicines.map(computeMedicineStatus);

    const stats = {
      totalMedicines: computed.length,
      expiredCount: computed.filter((m) => m.status === 'EXPIRED').length,
      expiringSoonCount: computed.filter((m) => m.status === 'EXPIRING_SOON').length,
      safeCount: computed.filter((m) => m.status === 'SAFE').length,
      lowStockCount: computed.filter((m) => m.isLowStock).length,
      totalQuantity: computed.reduce((sum, m) => sum + (m.quantity || 0), 0),
    };

    return res.json({
      success: true,
      stats,
    });
  } catch (err) {
    console.error('Error fetching stats:', err);
    return res.status(500).json({ success: false, message: 'Failed to calculate stats.' });
  }
});

// GET /api/medicines/alerts/critical - Security & Expiry alerts
router.get('/alerts/critical', async (req, res) => {
  try {
    const medicines = await Medicine.find().sort({ expiryDate: 1 });
    const computed = medicines.map(computeMedicineStatus);

    const expiredList = computed.filter((m) => m.status === 'EXPIRED');
    const expiringSoonList = computed.filter((m) => m.status === 'EXPIRING_SOON');

    return res.json({
      success: true,
      timestamp: new Date(),
      alerts: {
        expiredCount: expiredList.length,
        expiringSoonCount: expiringSoonList.length,
        expiredMedicines: expiredList,
        expiringSoonMedicines: expiringSoonList,
      },
    });
  } catch (err) {
    console.error('Error fetching alerts:', err);
    return res.status(500).json({ success: false, message: 'Failed to load alerts.' });
  }
});

// GET /api/medicines - List all with optional filter and search
router.get('/', async (req, res) => {
  try {
    const { search, status, sortBy = 'expiryDate', sortOrder = 'asc' } = req.query;

    let query = {};

    // Search by medicine name or batch number
    if (search && search.trim() !== '') {
      const term = search.trim();
      query.$or = [
        { name: { $regex: term, $options: 'i' } },
        { batchNumber: { $regex: term, $options: 'i' } },
        { category: { $regex: term, $options: 'i' } },
        { storageLocation: { $regex: term, $options: 'i' } },
      ];
    }

    const sortOption = {};
    sortOption[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const rawMedicines = await Medicine.find(query).sort(sortOption);
    let computedList = rawMedicines.map(computeMedicineStatus);

    // Filter by computed status if requested
    if (status && status !== 'ALL') {
      computedList = computedList.filter((m) => m.status === status);
    }

    return res.json({
      success: true,
      count: computedList.length,
      medicines: computedList,
    });
  } catch (err) {
    console.error('Error fetching medicines:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch medicines.' });
  }
});

// GET /api/medicines/:id - View single medicine details
router.get('/:id', async (req, res) => {
  try {
    const medicine = await Medicine.findById(req.params.id);
    if (!medicine) {
      return res.status(404).json({ success: false, message: 'Medicine not found.' });
    }

    return res.json({
      success: true,
      medicine: computeMedicineStatus(medicine),
    });
  } catch (err) {
    console.error('Error fetching medicine by ID:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch medicine details.' });
  }
});

// POST /api/medicines - Add new medicine (Protected)
router.post('/', requireAdmin, async (req, res) => {
  try {
    const { name, batchNumber, quantity, manufacturingDate, expiryDate, category, storageLocation, supplier } =
      req.body;

    // Validation
    if (!name || !batchNumber || quantity === undefined || !manufacturingDate || !expiryDate) {
      return res.status(400).json({
        success: false,
        message: 'Name, Batch Number, Quantity, Manufacturing Date, and Expiry Date are all required.',
      });
    }

    const mfg = new Date(manufacturingDate);
    const exp = new Date(expiryDate);

    if (isNaN(mfg.getTime()) || isNaN(exp.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid Manufacturing Date or Expiry Date format.',
      });
    }

    if (exp <= mfg) {
      return res.status(400).json({
        success: false,
        message: 'Expiry date must be after manufacturing date.',
      });
    }

    // Check duplicate batch number
    const existing = await Medicine.findOne({ batchNumber: batchNumber.toUpperCase().trim() });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: `A medicine with Batch Number "${batchNumber.toUpperCase().trim()}" already exists (${existing.name}).`,
      });
    }

    const newMedicine = new Medicine({
      name: name.trim(),
      batchNumber: batchNumber.toUpperCase().trim(),
      quantity: Number(quantity),
      manufacturingDate: mfg,
      expiryDate: exp,
      category: category ? category.trim() : 'General',
      storageLocation: storageLocation ? storageLocation.trim() : 'General Shelf',
      supplier: supplier ? supplier.trim() : 'Authorized Pharmacy Supplier',
    });

    await newMedicine.save();

    return res.status(201).json({
      success: true,
      message: 'Medicine added successfully to MediGuard inventory.',
      medicine: computeMedicineStatus(newMedicine),
    });
  } catch (err) {
    console.error('Error adding medicine:', err);
    return res.status(500).json({
      success: false,
      message: err.message || 'Failed to add medicine.',
    });
  }
});

// PUT /api/medicines/:id - Update medicine details (Protected)
router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const { name, batchNumber, quantity, manufacturingDate, expiryDate, category, storageLocation, supplier } =
      req.body;

    const medicine = await Medicine.findById(req.params.id);
    if (!medicine) {
      return res.status(404).json({ success: false, message: 'Medicine not found.' });
    }

    // If batch number is changed, ensure no collision
    if (batchNumber && batchNumber.toUpperCase().trim() !== medicine.batchNumber) {
      const existing = await Medicine.findOne({
        batchNumber: batchNumber.toUpperCase().trim(),
        _id: { $ne: req.params.id },
      });
      if (existing) {
        return res.status(400).json({
          success: false,
          message: `Batch Number "${batchNumber.toUpperCase().trim()}" is already used by another record.`,
        });
      }
      medicine.batchNumber = batchNumber.toUpperCase().trim();
    }

    if (name) medicine.name = name.trim();
    if (quantity !== undefined) medicine.quantity = Number(quantity);
    if (category) medicine.category = category.trim();
    if (storageLocation) medicine.storageLocation = storageLocation.trim();
    if (supplier) medicine.supplier = supplier.trim();

    if (manufacturingDate) {
      const mfg = new Date(manufacturingDate);
      if (!isNaN(mfg.getTime())) medicine.manufacturingDate = mfg;
    }

    if (expiryDate) {
      const exp = new Date(expiryDate);
      if (!isNaN(exp.getTime())) medicine.expiryDate = exp;
    }

    if (medicine.expiryDate <= medicine.manufacturingDate) {
      return res.status(400).json({
        success: false,
        message: 'Expiry date must be after manufacturing date.',
      });
    }

    await medicine.save();

    return res.json({
      success: true,
      message: 'Medicine updated successfully.',
      medicine: computeMedicineStatus(medicine),
    });
  } catch (err) {
    console.error('Error updating medicine:', err);
    return res.status(500).json({
      success: false,
      message: err.message || 'Failed to update medicine.',
    });
  }
});

// DELETE /api/medicines/:id - Delete medicine (Protected)
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const deleted = await Medicine.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Medicine not found.' });
    }

    return res.json({
      success: true,
      message: `Medicine "${deleted.name}" (Batch: ${deleted.batchNumber}) removed from MediGuard.`,
    });
  } catch (err) {
    console.error('Error deleting medicine:', err);
    return res.status(500).json({ success: false, message: 'Failed to delete medicine.' });
  }
});

module.exports = router;
