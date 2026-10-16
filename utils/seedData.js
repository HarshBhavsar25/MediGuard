const User = require('../models/User');
const Medicine = require('../models/Medicine');

async function seedInitialData() {
  try {
    // 1. Seed default Admin if no users exist
    const adminCount = await User.countDocuments();
    if (adminCount === 0) {
      const defaultAdmin = new User({
        username: process.env.ADMIN_USERNAME || 'admin',
        password: User.hashPassword(process.env.ADMIN_PASSWORD || 'admin123'),
        name: 'Dr. Sarah Mitchell (Lead Pharmacist)',
        role: 'admin',
      });
      await defaultAdmin.save();
      console.log('Default admin seeded: [Username: admin, Password: admin123]');
    }

    // 2. Seed realistic demo medicines if database is empty
    const medicineCount = await Medicine.countDocuments();
    if (medicineCount === 0) {
      const now = new Date(); // Current system time
      const year = now.getFullYear();
      const month = now.getMonth();
      const date = now.getDate();

      const demoMedicines = [
        // Expired Medicines (Danger / Red alert)
        {
          name: 'Amoxicillin 500mg (Capsules)',
          batchNumber: 'AMX-2023-091',
          quantity: 45,
          manufacturingDate: new Date(year - 2, month - 3, 15),
          expiryDate: new Date(year, month - 2, 10), // Expired 2 months ago
          category: 'Antibiotic',
          storageLocation: 'Shelf A-02',
          supplier: 'Pfizer BioPharma Ltd',
        },
        {
          name: 'Ciprofloxacin 250mg (Tablets)',
          batchNumber: 'CIP-2024-118',
          quantity: 20,
          manufacturingDate: new Date(year - 2, month - 1, 10),
          expiryDate: new Date(year, month, date - 12), // Expired 12 days ago
          category: 'Antibiotic',
          storageLocation: 'Shelf A-04',
          supplier: 'Bayer Healthcare',
        },
        // Expiring Soon (Warning / Yellow alert: within 30 days)
        {
          name: 'Azithromycin 250mg (Tablets)',
          batchNumber: 'AZI-2024-402',
          quantity: 75,
          manufacturingDate: new Date(year - 1, month, 1),
          expiryDate: new Date(year, month, date + 8), // Expiring in 8 days
          category: 'Antibiotic',
          storageLocation: 'Shelf B-01',
          supplier: 'Sun Pharma Ltd',
        },
        {
          name: 'Paracetamol 650mg (Dolo)',
          batchNumber: 'PCM-2025-882',
          quantity: 160,
          manufacturingDate: new Date(year - 1, month + 2, 5),
          expiryDate: new Date(year, month, date + 18), // Expiring in 18 days
          category: 'Analgesic / Antipyretic',
          storageLocation: 'Shelf B-05',
          supplier: 'Micro Labs Ltd',
        },
        {
          name: 'Cetirizine 10mg (Allergy Relief)',
          batchNumber: 'CET-2025-331',
          quantity: 90,
          manufacturingDate: new Date(year - 1, month + 3, 14),
          expiryDate: new Date(year, month, date + 26), // Expiring in 26 days
          category: 'Antihistamine',
          storageLocation: 'Shelf C-03',
          supplier: 'Cipla Therapeutics',
        },
        // Safe / Good Standing (Green status)
        {
          name: 'Metformin HCl 500mg',
          batchNumber: 'MET-2025-104',
          quantity: 240,
          manufacturingDate: new Date(year, month - 5, 20),
          expiryDate: new Date(year + 1, month + 4, 15),
          category: 'Antidiabetic',
          storageLocation: 'Shelf D-01',
          supplier: 'Merck & Co.',
        },
        {
          name: 'Atorvastatin 20mg (Cholesterol)',
          batchNumber: 'ATV-2025-667',
          quantity: 110,
          manufacturingDate: new Date(year, month - 3, 15),
          expiryDate: new Date(year + 1, month + 8, 20),
          category: 'Cardiovascular',
          storageLocation: 'Shelf D-03',
          supplier: 'Dr. Reddy\'s Laboratories',
        },
        {
          name: 'Omeprazole 20mg (Antacid)',
          batchNumber: 'OMP-2025-901',
          quantity: 7, // Low stock demo!
          manufacturingDate: new Date(year, month - 2, 1),
          expiryDate: new Date(year + 1, month + 6, 30),
          category: 'Gastrointestinal',
          storageLocation: 'Cabinet G-12',
          supplier: 'AstraZeneca',
        },
        {
          name: 'Insulin Glargine 100 IU/ml',
          batchNumber: 'INS-2026-003',
          quantity: 32,
          manufacturingDate: new Date(year, month - 1, 10),
          expiryDate: new Date(year + 1, month + 2, 14),
          category: 'Hormone / Endocrine',
          storageLocation: 'Cold Storage Fridge #2 (2-8°C)',
          supplier: 'Sanofi Healthcare',
        },
      ];

      await Medicine.insertMany(demoMedicines);
      console.log(`Demo medicines seeded successfully (${demoMedicines.length} records).`);
    }
  } catch (err) {
    console.error('Error during data seeding:', err.message);
  }
}

module.exports = {
  seedInitialData,
};
