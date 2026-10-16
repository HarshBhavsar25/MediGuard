# MediGuard – Medicine Expiry and Security Alert System

A modern, responsive, and beginner-friendly web application designed for pharmacies, clinics, and hospital dispensaries to prevent expired medicine exposure, track batch-level stock, and enforce security policies.

---

## 🌟 Key Features

1. **Complete Medicine CRUD Management**
   - **Add**: Register medicines with Name, Batch Number, Quantity, Manufacturing Date, Expiry Date, Category, Storage Location, and Supplier.
   - **Update**: Modify stock counts, change storage locations, or correct records with instant validation (Expiry Date must be after Manufacturing Date).
   - **Delete**: Safely remove decommissioned or destroyed medicine batches with confirmation safeguards.
   - **View Details**: Inspect individual medicine specifications, active expiry windows, and pharmacy safety advisories.

2. **Smart Security & Expiry Alert Engine**
   - 🔴 **Expired Medicines (Danger Alert)**: Highlights medicines past their expiration date. Triggers a high-priority security alert banner requiring immediate quarantine to protect patient safety.
   - 🟡 **Expiring Soon (Warning Alert)**: Identifies medicines with 30 days or fewer remaining. Alerts pharmacy staff to prioritize dispensing or coordinate manufacturer returns.
   - 🟢 **Safe & Valid Stock (Normal Status)**: Validates medicines safely within shelf-life thresholds.
   - 📦 **Low Stock Warning**: Highlights items with 10 or fewer units in stock.

3. **Interactive Pharmacy Dashboard**
   - Real-time stat summary cards:
     - **Total Medicines**
     - **Expired Drugs** (with pulsing alert indicator)
     - **Expiring Soon (<30 Days)**
     - **Safe & Valid Stock**
   - Click any stat card to instantly filter the inventory table.
   - Real-time search by medicine name, batch number, category, or storage location.
   - Status filter tabs: `All Stock`, `Expired`, `Expiring Soon`, `Safe`, and `Low Stock`.

4. **Basic Admin Login for Security**
   - Role-based session security (`express-session`).
   - Guest Mode allows read-only viewing of the inventory and alert status.
   - Admin Login unlocks full Add, Edit, and Delete privileges.
   - **Quick Demo Login button** included in the navigation bar for 1-click evaluation without typing credentials.

5. **Pharmacy Audit Tools**
   - **Export CSV**: One-click download of the complete inventory with computed status, batch numbers, and days remaining.
   - **Print Audit Sheet**: Clean printer-optimized layout for physical pharmacy checks.

---

## 🛠️ Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend** | HTML5, Vanilla CSS3 (Custom Healthcare Theme), JavaScript (ES6+ Fetch API), Bootstrap 5.3, Bootstrap Icons |
| **Backend** | Node.js, Express.js |
| **Database** | MongoDB with Mongoose ODM |
| **Authentication** | Session-based (`express-session`) with cryptographic password verification |

---

## 📁 Project Structure

```text
MediGuard/
├── config/
│   └── db.js                 # MongoDB connection with automatic zero-config fallback
├── middleware/
│   └── authMiddleware.js     # Admin authorization middleware
├── models/
│   ├── Medicine.js           # Mongoose Medicine Schema & virtual status helpers
│   └── User.js               # Mongoose User Schema for Admin authentication
├── routes/
│   ├── authRoutes.js         # /api/auth/login, /logout, /check, /demo-credentials
│   └── medicineRoutes.js     # /api/medicines CRUD, /stats/summary, /alerts/critical
├── utils/
│   └── seedData.js           # Auto-seeds realistic sample medicines & default admin
├── public/
│   ├── index.html            # Main responsive dashboard
│   ├── login.html            # Standalone Admin sign-in portal
│   ├── css/
│   │   └── style.css         # Modern pharmacy styling, badges, animations
│   └── js/
│       ├── app.js            # Client-side state, CRUD, rendering, modals, CSV export
│       └── auth.js           # Admin session management and UI gating
├── .env                      # Environment configuration
├── .env.example              # Environment template
├── package.json              # Project dependencies & scripts
├── server.js                 # Express server entry point
└── README.md                 # Project documentation
```

---

## 🚀 Getting Started

### 1. Prerequisites
- [Node.js](https://nodejs.org/) (v16 or newer installed)
- npm (installed with Node)

### 2. Installation
Open your terminal in the project directory:
```bash
npm install
```

### 3. Configure Database (.env)
The project is configured to **work out-of-the-box immediately without any database installation needed** via the built-in in-memory MongoDB runner.

If you have a local MongoDB daemon or MongoDB Atlas connection string, you can optionally set it in `.env`:
```env
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/mediguard
# Or MongoDB Atlas:
# MONGODB_URI=mongodb+srv://<user>:<password>@cluster0.mongodb.net/mediguard?retryWrites=true&w=majority

SESSION_SECRET=mediguard_secure_session_pharmacy_key_2026
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123
```

### 4. Run the Project
Start the server:
```bash
npm start
```
Or with auto-restart on changes:
```bash
npm run dev
```

Open your browser and navigate to:
```text
http://localhost:5000
```

---

## 🔐 Default Admin Credentials

| Parameter | Value |
|---|---|
| **Username** | `admin` |
| **Password** | `admin123` |

*(You can also click the **"Demo Login"** button in the top navbar to automatically fill and sign in).*

---

## 📡 REST API Reference

### Authentication (`/api/auth`)
- `POST /api/auth/login` – Sign in as Admin (`{ username, password }`).
- `POST /api/auth/logout` – Destroy session and sign out.
- `GET /api/auth/check` – Verify active session and role.
- `GET /api/auth/demo-credentials` – Retrieve demo login helper info.

### Medicines (`/api/medicines`)
- `GET /api/medicines` – Fetch medicines list. Query params: `search`, `status` (`EXPIRED`, `EXPIRING_SOON`, `SAFE`, `ALL`), `sortBy`, `sortOrder`.
- `GET /api/medicines/:id` – Fetch single medicine details.
- `GET /api/medicines/stats/summary` – Get aggregate counts for dashboard cards.
- `GET /api/medicines/alerts/critical` – Retrieve list of expired and expiring soon items for alert banners.
- `POST /api/medicines` *(Admin Only)* – Add a new medicine.
- `PUT /api/medicines/:id` *(Admin Only)* – Update existing medicine.
- `DELETE /api/medicines/:id` *(Admin Only)* – Remove medicine from inventory.

---

## 🛡️ Expiry & Security Logic

- **Expired**: `expiryDate < Current Date` (Days remaining < 0).
- **Expiring Soon**: `0 <= Days remaining <= 30 days`.
- **Safe Stock**: `Days remaining > 30 days`.
- **Validation**: Enforces that `expiryDate > manufacturingDate`.

---

## 📄 License
This project is open-source and free to use for educational, demonstration, and pharmacy management purposes.
