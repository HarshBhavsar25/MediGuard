// ========================================================
// MediGuard – Admin Authentication Management
// ========================================================

const Auth = {
  currentAdmin: null,

  // Check login state on initial load
  async checkAuth() {
    try {
      const response = await fetch('/api/auth/check');
      const data = await response.json();

      if (data.authenticated && data.admin) {
        this.currentAdmin = data.admin;
      } else {
        this.currentAdmin = null;
      }

      this.updateUI();
      return this.currentAdmin;
    } catch (err) {
      console.warn('Could not verify auth status:', err);
      this.currentAdmin = null;
      this.updateUI();
      return null;
    }
  },

  // Perform Admin Login
  async login(username, password) {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Login failed. Please check credentials.');
      }

      this.currentAdmin = data.admin;
      this.updateUI();
      return data;
    } catch (err) {
      throw err;
    }
  },

  // Perform Admin Logout
  async logout() {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (err) {
      console.warn('Error during logout:', err);
    } finally {
      this.currentAdmin = null;
      this.updateUI();
      if (window.App) {
        App.showView('landing');
        App.showToast('Logged Out', 'You have been signed out to public landing page.', 'info');
      } else {
        window.location.href = '/#landing';
      }
    }
  },

  // Update UI indicators depending on Admin status
  updateUI() {
    const adminBadgeContainer = document.getElementById('adminBadgeContainer');
    const authActionBtn = document.getElementById('authActionBtn');
    const adminControls = document.querySelectorAll('.admin-only');

    if (this.currentAdmin) {
      // Admin is logged in
      if (adminBadgeContainer) {
        adminBadgeContainer.innerHTML = `
          <span class="badge bg-success-subtle text-success border border-success-subtle d-inline-flex align-items-center gap-1 py-2 px-3 rounded-pill">
            <i class="bi bi-shield-lock-fill text-success"></i>
            <strong>Admin:</strong> ${this.currentAdmin.name || this.currentAdmin.username}
          </span>
        `;
      }

      if (authActionBtn) {
        authActionBtn.innerHTML = `
          <i class="bi bi-box-arrow-right me-1"></i> Logout
        `;
        authActionBtn.onclick = () => Auth.logout();
      }

      // Enable Admin Controls
      adminControls.forEach((el) => {
        el.removeAttribute('disabled');
        el.classList.remove('d-none');
      });
    } else {
      // Guest / Not logged in
      if (adminBadgeContainer) {
        adminBadgeContainer.innerHTML = `
          <span class="badge bg-secondary-subtle text-secondary border border-secondary-subtle d-inline-flex align-items-center gap-1 py-2 px-3 rounded-pill">
            <i class="bi bi-eye"></i> Guest Mode (Read Only)
          </span>
        `;
      }

      // Hide or disable Admin-only actions
      adminControls.forEach((el) => {
        if (el.tagName === 'BUTTON') {
          // If clicked while not logged in, prompt to log in and show login screen
          el.onclick = (e) => {
            e.preventDefault();
            if (window.App) {
              App.showToast('Authentication Required', 'Please login as Admin to modify medicine records.', 'warning');
              App.showView('login');
            } else {
              const loginModal = new bootstrap.Modal(document.getElementById('loginModal'));
              loginModal.show();
            }
          };
        }
      });
    }
  },

  // Fill default demo credentials in both modal and standalone forms
  async fillDemoCredentials() {
    let user = 'admin';
    let pass = 'admin123';
    try {
      const res = await fetch('/api/auth/demo-credentials');
      const creds = await res.json();
      if (creds.username) user = creds.username;
      if (creds.password) pass = creds.password;
    } catch (err) {
      // fallback to default
    }

    const modalUser = document.getElementById('loginUsername');
    const modalPass = document.getElementById('loginPassword');
    const viewUser = document.getElementById('viewLoginUsername');
    const viewPass = document.getElementById('viewLoginPassword');

    if (modalUser) modalUser.value = user;
    if (modalPass) modalPass.value = pass;
    if (viewUser) viewUser.value = user;
    if (viewPass) viewPass.value = pass;

    if (window.App) {
      App.showToast('Demo Credentials Filled', 'Username: admin | Password: admin123', 'info');
    }
  },
};
