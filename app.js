/* ==========================================================================
   SARWESV ADMIN DASHBOARD - LOGIC & FIREBASE CONTROLLER
   ========================================================================== */

const ADMIN_EMAIL = "mogalt@gmail.com";
let allSubscribers = [];
let filteredSubscribers = [];

document.addEventListener('DOMContentLoaded', () => {
  initAuthListener();
});

function initAuthListener() {
  if (typeof auth === 'undefined' || !auth) return;

  auth.onAuthStateChanged(user => {
    const lockScreen = document.getElementById('lock-screen');
    const adminWorkspace = document.getElementById('admin-workspace');
    const deniedMsg = document.getElementById('access-denied-msg');
    const userDisplay = document.getElementById('admin-user-display');

    if (user && user.email.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
      lockScreen.style.display = 'none';
      adminWorkspace.style.display = 'block';
      if (userDisplay) userDisplay.textContent = user.email;
      loadSubscribers();
    } else {
      adminWorkspace.style.display = 'none';
      lockScreen.style.display = 'flex';

      if (user) {
        // Logged in with wrong email
        if (deniedMsg) deniedMsg.style.display = 'block';
        showToast(`Access Denied: ${user.email} is not authorized.`, 'warning');
      } else {
        if (deniedMsg) deniedMsg.style.display = 'none';
      }
    }
  });
}

window.handleAdminLogin = async function() {
  if (typeof auth === 'undefined' || !auth || !googleProvider) {
    showToast('Initializing Firebase Auth...', 'info');
    return;
  }

  try {
    showToast('Opening Admin Google Sign-In popup...', 'info');
    googleProvider.setCustomParameters({ prompt: 'select_account' });
    await auth.signInWithPopup(googleProvider);
  } catch (error) {
    console.error("Admin Login Error:", error);
    showToast(`Login Error: ${error.message}`, 'warning');
  }
};

window.handleAdminLogout = function() {
  if (auth) {
    auth.signOut();
    showToast('Signed out of Admin Dashboard.', 'info');
  }
};

async function loadSubscribers() {
  allSubscribers = [];

  // 1. Fetch from Firestore if initialized
  if (typeof db !== 'undefined' && db) {
    try {
      db.collection('newsletter_subscribers')
        .orderBy('subscribedAt', 'desc')
        .onSnapshot(snapshot => {
          const cloudSubs = [];
          snapshot.forEach(doc => {
            cloudSubs.push({ id: doc.id, ...doc.data() });
          });
          mergeAndRenderSubscribers(cloudSubs);
        }, error => {
          console.warn("Firestore snapshot error:", error.message);
          mergeAndRenderSubscribers([]);
        });
    } catch (e) {
      console.warn("Firestore error:", e.message);
      mergeAndRenderSubscribers([]);
    }
  } else {
    mergeAndRenderSubscribers([]);
  }
}

function mergeAndRenderSubscribers(cloudSubs) {
  const localList = JSON.parse(localStorage.getItem('newsletter_subscribers_list') || '[]');
  const combined = [...cloudSubs];

  localList.forEach(localItem => {
    const exists = combined.some(c => c.email && c.email.toLowerCase() === localItem.email.toLowerCase());
    if (!exists) {
      combined.push(localItem);
    }
  });

  allSubscribers = combined;
  filteredSubscribers = [...allSubscribers];

  updateStats();
  renderTable();
}

function updateStats() {
  const total = allSubscribers.length;
  const googleCount = allSubscribers.filter(s => (s.authType || '').includes('google')).length;
  
  const now = new Date();
  const recentCount = allSubscribers.filter(s => {
    if (!s.subscribedAt) return false;
    const diffDays = (now - new Date(s.subscribedAt)) / (1000 * 3600 * 24);
    return diffDays <= 7;
  }).length;

  document.getElementById('stat-total').textContent = total;
  document.getElementById('stat-google').textContent = googleCount;
  document.getElementById('stat-recent').textContent = recentCount;
}

function renderTable() {
  const tbody = document.getElementById('subscribers-table-body');
  if (!tbody) return;

  if (filteredSubscribers.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align: center; color: var(--text-muted); padding: 3rem;">
          No subscribers found matching your search.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = filteredSubscribers.map((sub, index) => {
    const isGoogle = (sub.authType || '').includes('google');
    const badgeClass = isGoogle ? 'badge-google' : 'badge-email';
    const badgeLabel = isGoogle ? 'Google Auth' : 'Email Input';

    const dateStr = sub.subscribedAt 
      ? new Date(sub.subscribedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
      : 'N/A';

    return `
      <tr>
        <td style="color: var(--text-muted); font-weight: 600;">${index + 1}</td>
        <td style="font-weight: 600;">${escapeHTML(sub.displayName || 'Subscriber')}</td>
        <td style="color: var(--accent-cyan); font-family: monospace;">${escapeHTML(sub.email || '')}</td>
        <td><span class="badge ${badgeClass}">${badgeLabel}</span></td>
        <td style="color: var(--text-muted); font-size: 0.85rem;">${dateStr}</td>
        <td>
          <button onclick="copySingleEmail('${escapeHTML(sub.email)}')" class="btn btn-secondary btn-sm" title="Copy Email">
            Copy
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

window.handleSearchFilter = function() {
  const query = document.getElementById('search-input').value.toLowerCase().trim();
  if (!query) {
    filteredSubscribers = [...allSubscribers];
  } else {
    filteredSubscribers = allSubscribers.filter(s => 
      (s.displayName || '').toLowerCase().includes(query) ||
      (s.email || '').toLowerCase().includes(query)
    );
  }
  renderTable();
};

window.copyAllEmailAddresses = function() {
  if (allSubscribers.length === 0) {
    showToast('No subscribers available to copy.', 'warning');
    return;
  }

  const emailList = allSubscribers.map(s => s.email).filter(Boolean).join(', ');
  navigator.clipboard.writeText(emailList).then(() => {
    showToast(`Copied ${allSubscribers.length} subscriber emails to clipboard!`, 'success');
  }).catch(() => {
    showToast('Failed to copy emails automatically.', 'warning');
  });
};

window.copySingleEmail = function(email) {
  navigator.clipboard.writeText(email).then(() => {
    showToast(`Copied ${email}!`, 'success');
  });
};

window.exportSubscribersCSV = function() {
  if (allSubscribers.length === 0) {
    showToast('No subscriber data to export.', 'warning');
    return;
  }

  let csvContent = "data:text/csv;charset=utf-8,Name,Email,AuthType,SubscribedDate\n";
  allSubscribers.forEach(sub => {
    const row = [
      `"${sub.displayName || ''}"`,
      `"${sub.email || ''}"`,
      `"${sub.authType || ''}"`,
      `"${sub.subscribedAt || ''}"`
    ].join(",");
    csvContent += row + "\n";
  });

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `sarwesv_subscribers_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  showToast('Downloaded subscribers CSV file!', 'success');
};

function showToast(message, type = 'info') {
  const toast = document.getElementById('toast-bar');
  const toastText = document.getElementById('toast-text');
  if (!toast || !toastText) return;

  toastText.textContent = message;
  toast.classList.add('show');

  setTimeout(() => {
    toast.classList.remove('show');
  }, 4000);
}

function escapeHTML(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
