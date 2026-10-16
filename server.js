require('dotenv').config();
const express = require('express');
const path = require('path');
const session = require('express-session');
const cors = require('cors');
const { connectDB } = require('./config/db');
const { seedInitialData } = require('./utils/seedData');

const authRoutes = require('./routes/authRoutes');
const medicineRoutes = require('./routes/medicineRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Express Session configuration for Admin authentication
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'mediguard_super_secret_pharmacy_key_2026',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24, // 24 hours
      sameSite: 'lax',
    },
  })
);

// Serve static frontend files from 'public' folder
app.use(express.static(path.join(__dirname, 'public')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/medicines', medicineRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    system: 'MediGuard – Medicine Expiry and Security Alert System',
    timestamp: new Date(),
    environment: process.env.NODE_ENV || 'development',
  });
});

// Fallback for SPA/Client-side routes
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start Server after connecting to MongoDB
async function startServer() {
  try {
    await connectDB();
    await seedInitialData();

    app.listen(PORT, () => {
      console.log('========================================================');
      console.log(` MediGuard Server is running!`);
      console.log(` URL: http://localhost:${PORT}`);
      console.log(` Admin Credentials: admin / admin123`);
      console.log('========================================================');
    });
  } catch (err) {
    console.error('Failed to start MediGuard server:', err);
    process.exit(1);
  }
}

startServer();
