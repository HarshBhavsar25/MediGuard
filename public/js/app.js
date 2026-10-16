// ========================================================
// MediGuard – Main Application Client Logic
// ========================================================

const App = {
  medicines: [],
  currentFilter: 'ALL',
  searchQuery: '',
  activeDeleteId: null,
  currentView: 'landing',

  // Initialize Application
  async init() {
    this.updateClock();
    setInterval(() => this.updateClock(), 1000);

    // Check authentication status first
    await Auth.checkAuth();

    // Determine initial view: without login, show landing page
    const initialHash = window.location.hash.replace('#', '').toLowerCase();
    if (initialHash === 'login') {
      this.showView('login', false, false);
    } else if (initialHash === 'dashboard' && Auth.currentAdmin) {
      this.showView('dashboard', false, false);
    } else if (Auth.currentAdmin) {
      this.showView('dashboard', false, false);
    } else {
      // Without login: show landing page
      this.showView('landing', false, false);
    }

    // Load dashboard stats, alerts, and inventory
    await Promise.all([this.loadStats(), this.loadAlerts(), this.loadMedicines()]);

    this.bindEvents();

    // Support browser hash change navigation
    window.addEventListener('hashchange', () => {
      const hash = window.location.hash.replace('#', '').toLowerCase();
      if (['landing', 'login', 'dashboard'].includes(hash)) {
        this.showView(hash, false, false);
      }
    });
  },

  // Show specific view: 'landing' | 'login' | 'dashboard'
  showView(viewName, autoFill = false, updateHash = true) {
    if (viewName === 'dashboard' && !Auth.currentAdmin) {
      this.showToast('Authentication Required', 'Please sign in to access the administrator dashboard.', 'warning');
      viewName = 'login';
    }

    this.currentView = viewName;

    // Toggle active class on view sections
    document.querySelectorAll('.app-view').forEach((el) => el.classList.remove('active'));
    const targetEl = document.getElementById(`${viewName}View`);
    if (targetEl) {
      targetEl.classList.add('active');
    }

    // Toggle navigation actions in header
    const landingNavActions = document.getElementById('landingNavActions');
    const loginNavActions = document.getElementById('loginNavActions');
    const dashboardNavActions = document.getElementById('dashboardNavActions');
    const landingNavLinks = document.getElementById('landingNavLinks');

    if (landingNavActions) {
      landingNavActions.className = viewName === 'landing' ? 'd-flex align-items-center gap-2' : 'd-none';
    }
    if (loginNavActions) {
      loginNavActions.className = viewName === 'login' ? 'd-flex align-items-center gap-2' : 'd-none';
    }
    if (dashboardNavActions) {
      dashboardNavActions.className = viewName === 'dashboard' ? 'd-flex align-items-center flex-wrap gap-2' : 'd-none';
    }
    if (landingNavLinks) {
      landingNavLinks.style.display = viewName === 'landing' ? '' : 'none';
    }

    // View-specific adjustments
    if (viewName === 'login') {
      const errBox = document.getElementById('viewLoginErrorMessage');
      if (errBox) errBox.classList.add('d-none');
      if (autoFill) {
        Auth.fillDemoCredentials();
      }
      setTimeout(() => {
        const u = document.getElementById('viewLoginUsername');
        if (u) u.focus();
      }, 100);
    } else if (viewName === 'dashboard') {
      this.loadMedicines();
      this.loadAlerts();
    }

    if (updateHash) {
      history.replaceState(null, null, `#${viewName}`);
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  },

  // Update real-time clock in header
  updateClock() {
    const clockEl = document.getElementById('liveClock');
    if (clockEl) {
      const now = new Date();
      clockEl.textContent = now.toLocaleDateString(undefined, {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      }) + ' • ' + now.toLocaleTimeString();
    }
  },

  // Bind UI Events
  bindEvents() {
    // Search input
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.searchQuery = e.target.value.toLowerCase().trim();
        this.renderTable();
      });
    }

    // Filter Buttons
    document.querySelectorAll('.filter-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.filter-btn').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        this.currentFilter = btn.dataset.filter || 'ALL';
        this.renderTable();
      });
    });

    // Stat Cards as click-to-filter
    document.querySelectorAll('.stat-card').forEach((card) => {
      card.addEventListener('click', () => {
        const targetFilter = card.dataset.filter;
        if (targetFilter) {
          const matchingBtn = document.querySelector(`.filter-btn[data-filter="${targetFilter}"]`);
          if (matchingBtn) matchingBtn.click();
        }
      });
    });

    // Add Medicine Form Submission
    const addForm = document.getElementById('addMedicineForm');
    if (addForm) {
      addForm.addEventListener('submit', (e) => this.handleAddMedicine(e));
    }

    // Edit Medicine Form Submission
    const editForm = document.getElementById('editMedicineForm');
    if (editForm) {
      editForm.addEventListener('submit', (e) => this.handleEditMedicine(e));
    }

    // Dedicated View Login Form Submission
    const viewLoginForm = document.getElementById('viewLoginForm');
    if (viewLoginForm) {
      viewLoginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const user = document.getElementById('viewLoginUsername').value;
        const pass = document.getElementById('viewLoginPassword').value;
        const loginError = document.getElementById('viewLoginErrorMessage');
        const loginBtn = document.getElementById('viewLoginSubmitBtn');

        loginError.classList.add('d-none');
        loginBtn.disabled = true;
        loginBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Authenticating...';

        try {
          await Auth.login(user, pass);
          this.showToast('Authentication Success', 'Welcome back, Administrator!', 'success');
          this.showView('dashboard');
        } catch (err) {
          loginError.textContent = err.message || 'Login failed. Please verify credentials.';
          loginError.classList.remove('d-none');
        } finally {
          loginBtn.disabled = false;
          loginBtn.innerHTML = '<i class="bi bi-box-arrow-in-right me-1"></i> Sign In to Dashboard';
        }
      });
    }

    // Password visibility toggle on dedicated login screen
    const togglePasswordBtn = document.getElementById('togglePasswordBtn');
    if (togglePasswordBtn) {
      togglePasswordBtn.addEventListener('click', () => {
        const passInput = document.getElementById('viewLoginPassword');
        if (!passInput) return;
        const isPass = passInput.type === 'password';
        passInput.type = isPass ? 'text' : 'password';
        togglePasswordBtn.innerHTML = isPass ? '<i class="bi bi-eye-slash"></i>' : '<i class="bi bi-eye"></i>';
      });
    }

    // Modal Login Form Submission (Fallback)
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
      loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const user = document.getElementById('loginUsername').value;
        const pass = document.getElementById('loginPassword').value;
        const loginError = document.getElementById('loginErrorMessage');
        const loginBtn = document.getElementById('loginSubmitBtn');

        loginError.classList.add('d-none');
        loginBtn.disabled = true;
        loginBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Authenticating...';

        try {
          await Auth.login(user, pass);
          const loginModalEl = document.getElementById('loginModal');
          const modalInstance = bootstrap.Modal.getInstance(loginModalEl);
          if (modalInstance) modalInstance.hide();
          this.showToast('Authentication Success', 'Welcome back, Administrator!', 'success');
          this.showView('dashboard');
          await this.loadMedicines();
        } catch (err) {
          loginError.textContent = err.message || 'Login failed. Please verify credentials.';
          loginError.classList.remove('d-none');
        } finally {
          loginBtn.disabled = false;
          loginBtn.innerHTML = '<i class="bi bi-box-arrow-in-right me-1"></i> Sign In to MediGuard';
        }
      });
    }

    // Delete Confirmation Button
    const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
    if (confirmDeleteBtn) {
      confirmDeleteBtn.addEventListener('click', () => this.executeDelete());
    }
  },

  // Load Dashboard & Landing Statistics
  async loadStats() {
    try {
      const res = await fetch('/api/medicines/stats/summary');
      const data = await res.json();
      if (!data.success) return;

      const { stats } = data;
      const statTotal = document.getElementById('statTotal');
      const statExp = document.getElementById('statExpired');
      const statSoon = document.getElementById('statExpiringSoon');
      const statSafe = document.getElementById('statSafe');

      if (statTotal) statTotal.textContent = stats.totalMedicines;
      if (statExp) statExp.textContent = stats.expiredCount;
      if (statSoon) statSoon.textContent = stats.expiringSoonCount;
      if (statSafe) statSafe.textContent = stats.safeCount;

      // Update landing page hero preview live counts
      const heroExp = document.getElementById('heroStatExpired');
      const heroSoon = document.getElementById('heroStatExpiringSoon');
      const heroSafe = document.getElementById('heroStatSafe');
      const heroTrust = document.getElementById('heroTrustTotal');

      if (heroExp) heroExp.textContent = stats.expiredCount;
      if (heroSoon) heroSoon.textContent = stats.expiringSoonCount;
      if (heroSafe) heroSafe.textContent = stats.safeCount;
      if (heroTrust) heroTrust.textContent = stats.totalMedicines;

      // Update Filter button count badges
      const bAll = document.getElementById('badgeCountAll');
      const bExp = document.getElementById('badgeCountExpired');
      const bSoon = document.getElementById('badgeCountExpiringSoon');
      const bSafe = document.getElementById('badgeCountSafe');

      if (bAll) bAll.textContent = stats.totalMedicines;
      if (bExp) bExp.textContent = stats.expiredCount;
      if (bSoon) bSoon.textContent = stats.expiringSoonCount;
      if (bSafe) bSafe.textContent = stats.safeCount;
    } catch (err) {
      console.warn('Failed to load summary stats:', err);
    }
  },

  // Load Critical Security and Expiry Alerts
  async loadAlerts() {
    try {
      const res = await fetch('/api/medicines/alerts/critical');
      const data = await res.json();
      const banner = document.getElementById('securityAlertBanner');

      if (!data.success || !banner) return;

      const { expiredCount, expiringSoonCount, expiredMedicines, expiringSoonMedicines } = data.alerts;

      if (expiredCount > 0) {
        banner.className = 'security-alert-box alert-danger-urgent mb-4 d-flex align-items-center justify-content-between flex-wrap gap-3';
        banner.innerHTML = `
          <div class="d-flex align-items-center gap-3">
            <div class="stat-icon bg-danger text-white rounded-3 p-2">
              <i class="bi bi-exclamation-octagon-fill fs-3"></i>
            </div>
            <div>
              <div class="fw-bold fs-6 text-danger d-flex align-items-center">
                <span class="pulse-badge"></span> CRITICAL EXPOSURE & EXPIRY ALERT: ${expiredCount} Medicine(s) Expired!
              </div>
              <small class="text-secondary">
                Expired drugs pose health hazards. Immediate quarantine & disposal required per pharmacy security protocol.
              </small>
            </div>
          </div>
          <div class="d-flex gap-2">
            <button class="btn btn-danger btn-sm px-3 fw-bold shadow-sm" onclick="App.filterByStatus('EXPIRED')">
              <i class="bi bi-eye-fill me-1"></i> Quarantine Expired (${expiredCount})
            </button>
          </div>
        `;
        banner.classList.remove('d-none');
      } else if (expiringSoonCount > 0) {
        banner.className = 'security-alert-box alert-warning-caution mb-4 d-flex align-items-center justify-content-between flex-wrap gap-3';
        banner.innerHTML = `
          <div class="d-flex align-items-center gap-3">
            <div class="stat-icon bg-warning text-dark rounded-3 p-2">
              <i class="bi bi-clock-history fs-3"></i>
            </div>
            <div>
              <div class="fw-bold fs-6 text-warning-emphasis">
                <i class="bi bi-shield-exclamation me-1"></i> NOTICE: ${expiringSoonCount} Medicine(s) Nearing Expiry (<30 Days)
              </div>
              <small class="text-secondary">
                Prioritize dispensing for patient prescriptions or coordinate manufacturer return/replacement.
              </small>
            </div>
          </div>
          <div class="d-flex gap-2">
            <button class="btn btn-warning btn-sm px-3 fw-bold shadow-sm text-dark" onclick="App.filterByStatus('EXPIRING_SOON')">
              <i class="bi bi-filter me-1"></i> Review Expiring Soon (${expiringSoonCount})
            </button>
          </div>
        `;
        banner.classList.remove('d-none');
      } else {
        banner.classList.add('d-none');
      }
    } catch (err) {
      console.warn('Failed to load alert banner:', err);
    }
  },

  // Helper to switch filter from alert buttons
  filterByStatus(status) {
    const matchingBtn = document.querySelector(`.filter-btn[data-filter="${status}"]`);
    if (matchingBtn) matchingBtn.click();
    const tableSection = document.getElementById('inventorySection');
    if (tableSection) tableSection.scrollIntoView({ behavior: 'smooth' });
  },

  // Load All Medicines from API
  async loadMedicines() {
    try {
      const res = await fetch('/api/medicines?sortBy=expiryDate&sortOrder=asc');
      const data = await res.json();
      if (data.success) {
        this.medicines = data.medicines || [];
        this.renderTable();
      }
    } catch (err) {
      console.error('Failed to load medicines:', err);
      this.showToast('Network Error', 'Failed to fetch inventory from server.', 'danger');
    }
  },

  // Render Medicine Inventory Table
  renderTable() {
    const tbody = document.getElementById('medicineTableBody');
    const emptyState = document.getElementById('emptyState');
    const tableCountBadge = document.getElementById('tableCountBadge');

    if (!tbody) return;

    let filtered = this.medicines;

    // Filter by Status Tab
    if (this.currentFilter !== 'ALL') {
      if (this.currentFilter === 'LOW_STOCK') {
        filtered = filtered.filter((m) => m.quantity <= 10);
      } else {
        filtered = filtered.filter((m) => m.status === this.currentFilter);
      }
    }

    // Filter by Search Query
    if (this.searchQuery) {
      filtered = filtered.filter((m) => {
        return (
          m.name.toLowerCase().includes(this.searchQuery) ||
          m.batchNumber.toLowerCase().includes(this.searchQuery) ||
          (m.category && m.category.toLowerCase().includes(this.searchQuery)) ||
          (m.storageLocation && m.storageLocation.toLowerCase().includes(this.searchQuery))
        );
      });
    }

    if (tableCountBadge) {
      tableCountBadge.textContent = `${filtered.length} of ${this.medicines.length} medicines`;
    }

    if (filtered.length === 0) {
      tbody.innerHTML = '';
      if (emptyState) emptyState.classList.remove('d-none');
      return;
    }

    if (emptyState) emptyState.classList.add('d-none');

    tbody.innerHTML = filtered
      .map((med) => {
        const mfgFormatted = this.formatDate(med.manufacturingDate);
        const expFormatted = this.formatDate(med.expiryDate);

        let statusBadgeHtml = '';
        let rowClass = '';
        let daysHtml = '';

        if (med.status === 'EXPIRED') {
          statusBadgeHtml = `<span class="status-badge badge-expired"><i class="bi bi-x-octagon-fill"></i> Expired</span>`;
          rowClass = 'row-status-expired';
          daysHtml = `<span class="days-indicator text-danger">${Math.abs(med.daysRemaining)} days ago</span>`;
        } else if (med.status === 'EXPIRING_SOON') {
          statusBadgeHtml = `<span class="status-badge badge-expiring-soon"><i class="bi bi-exclamation-triangle-fill"></i> Expiring Soon</span>`;
          rowClass = 'row-status-expiring_soon';
          daysHtml = `<span class="days-indicator text-warning">${med.daysRemaining} days left</span>`;
        } else {
          statusBadgeHtml = `<span class="status-badge badge-safe"><i class="bi bi-check-circle-fill"></i> Safe & Valid</span>`;
          daysHtml = `<span class="days-indicator text-success">${med.daysRemaining} days left</span>`;
        }

        const quantityBadge =
          med.quantity <= 10
            ? `<span class="badge bg-danger-subtle text-danger border border-danger-subtle ms-1" title="Low Stock"><i class="bi bi-exclamation-circle"></i> Low: ${med.quantity}</span>`
            : `<span class="fw-bold">${med.quantity}</span>`;

        return `
        <tr class="${rowClass}">
          <td>
            <div class="fw-bold text-dark">${this.escapeHtml(med.name)}</div>
            <div class="text-muted small d-flex align-items-center gap-2 mt-1">
              <span class="badge bg-light text-secondary border">${this.escapeHtml(med.category || 'General')}</span>
              <span class="text-truncate" style="max-width: 140px;" title="${this.escapeHtml(med.storageLocation || 'Shelf')}">
                <i class="bi bi-geo-alt"></i> ${this.escapeHtml(med.storageLocation || 'Shelf')}
              </span>
            </div>
          </td>
          <td>
            <span class="batch-pill">${this.escapeHtml(med.batchNumber)}</span>
          </td>
          <td>
            ${quantityBadge}
          </td>
          <td class="text-secondary small">
            ${mfgFormatted}
          </td>
          <td>
            <div class="fw-semibold">${expFormatted}</div>
            <div class="small">${daysHtml}</div>
          </td>
          <td>
            ${statusBadgeHtml}
          </td>
          <td>
            <div class="action-btn-group d-flex gap-1">
              <button class="btn btn-outline-info text-info-emphasis" title="View Details" onclick="App.openDetailsModal('${med._id}')">
                <i class="bi bi-eye"></i>
              </button>
              <button class="btn btn-outline-primary admin-only" title="Edit Medicine" onclick="App.openEditModal('${med._id}')">
                <i class="bi bi-pencil"></i>
              </button>
              <button class="btn btn-outline-danger admin-only" title="Delete Medicine" onclick="App.confirmDelete('${med._id}', '${this.escapeHtml(med.name)}', '${this.escapeHtml(med.batchNumber)}')">
                <i class="bi bi-trash3"></i>
              </button>
            </div>
          </td>
        </tr>
      `;
      })
      .join('');

    // Re-apply admin visibility / gating
    Auth.updateUI();
  },

  // Add Medicine Form Handler
  async handleAddMedicine(e) {
    e.preventDefault();
    if (!Auth.currentAdmin) {
      this.showToast('Access Denied', 'Please sign in as Admin to add medicines.', 'warning');
      const loginModal = new bootstrap.Modal(document.getElementById('loginModal'));
      loginModal.show();
      return;
    }

    const name = document.getElementById('addName').value.trim();
    const batchNumber = document.getElementById('addBatchNumber').value.trim();
    const quantity = document.getElementById('addQuantity').value;
    const manufacturingDate = document.getElementById('addMfgDate').value;
    const expiryDate = document.getElementById('addExpDate').value;
    const category = document.getElementById('addCategory').value.trim();
    const storageLocation = document.getElementById('addLocation').value.trim();
    const supplier = document.getElementById('addSupplier').value.trim();

    const mfg = new Date(manufacturingDate);
    const exp = new Date(expiryDate);

    if (exp <= mfg) {
      this.showToast('Validation Error', 'Expiry Date must be later than Manufacturing Date.', 'danger');
      return;
    }

    const submitBtn = document.getElementById('addSubmitBtn');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Saving...';

    try {
      const res = await fetch('/api/medicines', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          batchNumber,
          quantity,
          manufacturingDate,
          expiryDate,
          category,
          storageLocation,
          supplier,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to add medicine.');
      }

      this.showToast('Success', data.message || 'Medicine registered successfully.', 'success');
      document.getElementById('addMedicineForm').reset();

      const modalEl = document.getElementById('addMedicineModal');
      const modalInstance = bootstrap.Modal.getInstance(modalEl);
      if (modalInstance) modalInstance.hide();

      await Promise.all([this.loadStats(), this.loadAlerts(), this.loadMedicines()]);
    } catch (err) {
      this.showToast('Error', err.message, 'danger');
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<i class="bi bi-plus-circle me-1"></i> Register Medicine';
    }
  },

  // Open Edit Modal with Pre-populated Data
  openEditModal(id) {
    if (!Auth.currentAdmin) {
      this.showToast('Admin Required', 'Please login to edit records.', 'warning');
      const loginModal = new bootstrap.Modal(document.getElementById('loginModal'));
      loginModal.show();
      return;
    }

    const med = this.medicines.find((m) => m._id === id);
    if (!med) return;

    document.getElementById('editId').value = med._id;
    document.getElementById('editName').value = med.name;
    document.getElementById('editBatchNumber').value = med.batchNumber;
    document.getElementById('editQuantity').value = med.quantity;
    document.getElementById('editCategory').value = med.category || 'General';
    document.getElementById('editLocation').value = med.storageLocation || 'General Shelf';
    document.getElementById('editSupplier').value = med.supplier || '';

    // Format dates to YYYY-MM-DD for date inputs
    document.getElementById('editMfgDate').value = this.toInputDate(med.manufacturingDate);
    document.getElementById('editExpDate').value = this.toInputDate(med.expiryDate);

    const editModal = new bootstrap.Modal(document.getElementById('editMedicineModal'));
    editModal.show();
  },

  // Edit Medicine Form Handler
  async handleEditMedicine(e) {
    e.preventDefault();
    const id = document.getElementById('editId').value;
    const name = document.getElementById('editName').value.trim();
    const batchNumber = document.getElementById('editBatchNumber').value.trim();
    const quantity = document.getElementById('editQuantity').value;
    const manufacturingDate = document.getElementById('editMfgDate').value;
    const expiryDate = document.getElementById('editExpDate').value;
    const category = document.getElementById('editCategory').value.trim();
    const storageLocation = document.getElementById('editLocation').value.trim();
    const supplier = document.getElementById('editSupplier').value.trim();

    const mfg = new Date(manufacturingDate);
    const exp = new Date(expiryDate);

    if (exp <= mfg) {
      this.showToast('Validation Error', 'Expiry Date must be later than Manufacturing Date.', 'danger');
      return;
    }

    const submitBtn = document.getElementById('editSubmitBtn');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Updating...';

    try {
      const res = await fetch(`/api/medicines/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          batchNumber,
          quantity,
          manufacturingDate,
          expiryDate,
          category,
          storageLocation,
          supplier,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to update medicine.');
      }

      this.showToast('Success', 'Medicine record updated successfully.', 'success');

      const modalEl = document.getElementById('editMedicineModal');
      const modalInstance = bootstrap.Modal.getInstance(modalEl);
      if (modalInstance) modalInstance.hide();

      await Promise.all([this.loadStats(), this.loadAlerts(), this.loadMedicines()]);
    } catch (err) {
      this.showToast('Error', err.message, 'danger');
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<i class="bi bi-check-circle me-1"></i> Save Changes';
    }
  },

  // Open Delete Confirmation Modal
  confirmDelete(id, name, batch) {
    if (!Auth.currentAdmin) {
      this.showToast('Admin Required', 'Please login to delete records.', 'warning');
      const loginModal = new bootstrap.Modal(document.getElementById('loginModal'));
      loginModal.show();
      return;
    }

    this.activeDeleteId = id;
    document.getElementById('deleteMedicineName').textContent = name;
    document.getElementById('deleteBatchNumber').textContent = batch;

    const deleteModal = new bootstrap.Modal(document.getElementById('deleteConfirmModal'));
    deleteModal.show();
  },

  // Execute Deletion
  async executeDelete() {
    if (!this.activeDeleteId) return;

    const btn = document.getElementById('confirmDeleteBtn');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Deleting...';

    try {
      const res = await fetch(`/api/medicines/${this.activeDeleteId}`, { method: 'DELETE' });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to delete record.');
      }

      this.showToast('Deleted', data.message || 'Medicine removed successfully.', 'info');

      const modalEl = document.getElementById('deleteConfirmModal');
      const modalInstance = bootstrap.Modal.getInstance(modalEl);
      if (modalInstance) modalInstance.hide();

      await Promise.all([this.loadStats(), this.loadAlerts(), this.loadMedicines()]);
    } catch (err) {
      this.showToast('Error', err.message, 'danger');
    } finally {
      this.activeDeleteId = null;
      btn.disabled = false;
      btn.innerHTML = '<i class="bi bi-trash3-fill me-1"></i> Delete Record';
    }
  },

  // Open Details Modal
  openDetailsModal(id) {
    const med = this.medicines.find((m) => m._id === id);
    if (!med) return;

    let alertBanner = '';
    if (med.status === 'EXPIRED') {
      alertBanner = `
        <div class="alert alert-danger d-flex align-items-center gap-2 mb-3">
          <i class="bi bi-exclamation-octagon-fill fs-4"></i>
          <div>
            <strong>SECURITY PROTOCOL: EXPIRED MEDICINE</strong><br>
            ${med.alertMessage}
          </div>
        </div>
      `;
    } else if (med.status === 'EXPIRING_SOON') {
      alertBanner = `
        <div class="alert alert-warning d-flex align-items-center gap-2 mb-3">
          <i class="bi bi-clock-history fs-4"></i>
          <div>
            <strong>EXPIRY ALERT: CRITICAL WINDOW</strong><br>
            ${med.alertMessage}
          </div>
        </div>
      `;
    } else {
      alertBanner = `
        <div class="alert alert-success d-flex align-items-center gap-2 mb-3">
          <i class="bi bi-check-circle-fill fs-4"></i>
          <div>
            <strong>STATUS: VALID & SAFE</strong><br>
            Medicine is well within the acceptable expiration threshold.
          </div>
        </div>
      `;
    }

    const content = `
      ${alertBanner}
      <div class="row g-3">
        <div class="col-12">
          <h5 class="fw-bold text-dark mb-1">${this.escapeHtml(med.name)}</h5>
          <div class="d-flex gap-2 flex-wrap mb-2">
            <span class="badge bg-primary-subtle text-primary border border-primary-subtle">${this.escapeHtml(med.category || 'General')}</span>
            <span class="badge bg-light text-dark border">Batch: ${this.escapeHtml(med.batchNumber)}</span>
          </div>
        </div>
        <div class="col-6 col-md-4">
          <div class="text-muted small">Current Stock</div>
          <div class="fw-bold fs-5">${med.quantity} Units ${med.quantity <= 10 ? '<span class="badge bg-danger">Low</span>' : ''}</div>
        </div>
        <div class="col-6 col-md-4">
          <div class="text-muted small">Manufacturing Date</div>
          <div class="fw-semibold">${this.formatDate(med.manufacturingDate)}</div>
        </div>
        <div class="col-6 col-md-4">
          <div class="text-muted small">Expiry Date</div>
          <div class="fw-semibold">${this.formatDate(med.expiryDate)}</div>
        </div>
        <div class="col-6 col-md-6">
          <div class="text-muted small">Storage Location</div>
          <div class="fw-semibold"><i class="bi bi-geo-alt"></i> ${this.escapeHtml(med.storageLocation || 'General Shelf')}</div>
        </div>
        <div class="col-6 col-md-6">
          <div class="text-muted small">Supplier / Manufacturer</div>
          <div class="fw-semibold">${this.escapeHtml(med.supplier || 'Authorized Pharmacy Supplier')}</div>
        </div>
      </div>
    `;

    document.getElementById('detailsModalBody').innerHTML = content;
    const modal = new bootstrap.Modal(document.getElementById('detailsModal'));
    modal.show();
  },

  // Export Inventory as CSV Report
  exportCSV() {
    if (this.medicines.length === 0) {
      this.showToast('Export Notice', 'No medicine records available to export.', 'warning');
      return;
    }

    const headers = [
      'Medicine Name',
      'Batch Number',
      'Category',
      'Quantity',
      'Manufacturing Date',
      'Expiry Date',
      'Days Remaining',
      'Status',
      'Storage Location',
      'Supplier',
    ];

    const rows = this.medicines.map((m) => [
      `"${(m.name || '').replace(/"/g, '""')}"`,
      `"${m.batchNumber}"`,
      `"${m.category || 'General'}"`,
      m.quantity,
      `"${this.formatDate(m.manufacturingDate)}"`,
      `"${this.formatDate(m.expiryDate)}"`,
      m.daysRemaining,
      `"${m.status}"`,
      `"${(m.storageLocation || '').replace(/"/g, '""')}"`,
      `"${(m.supplier || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `MediGuard_Inventory_Audit_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    this.showToast('Export Complete', 'Inventory audit CSV generated successfully.', 'success');
  },

  // Print Inventory Report
  printReport() {
    window.print();
  },

  // Toast Notification System
  showToast(title, message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    let icon = 'bi-info-circle';
    let bgHeader = 'bg-info text-white';

    if (type === 'success') {
      icon = 'bi-check-circle-fill';
      bgHeader = 'bg-success text-white';
    } else if (type === 'danger') {
      icon = 'bi-exclamation-octagon-fill';
      bgHeader = 'bg-danger text-white';
    } else if (type === 'warning') {
      icon = 'bi-exclamation-triangle-fill';
      bgHeader = 'bg-warning text-dark';
    }

    const toastId = 'toast_' + Date.now();
    const toastEl = document.createElement('div');
    toastEl.className = 'toast show shadow-lg border-0 mb-2';
    toastEl.id = toastId;
    toastEl.setAttribute('role', 'alert');
    toastEl.setAttribute('aria-live', 'assertive');
    toastEl.setAttribute('aria-atomic', 'true');

    toastEl.innerHTML = `
      <div class="toast-header ${bgHeader}">
        <i class="bi ${icon} me-2"></i>
        <strong class="me-auto">${title}</strong>
        <small class="text-white-50">Just now</small>
        <button type="button" class="btn-close ${type === 'warning' ? '' : 'btn-close-white'}" onclick="document.getElementById('${toastId}').remove()"></button>
      </div>
      <div class="toast-body bg-white text-dark">
        ${message}
      </div>
    `;

    container.appendChild(toastEl);
    setTimeout(() => {
      const el = document.getElementById(toastId);
      if (el) el.remove();
    }, 4500);
  },

  // Helpers
  formatDate(dateStr) {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  },

  toInputDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    return d.toISOString().split('T')[0];
  },

  escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  },
};

// Auto-run on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
