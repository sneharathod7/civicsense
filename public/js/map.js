// Map page logic with filters & auto-refresh

document.addEventListener('DOMContentLoaded', () => {
  const map = L.map('map').setView([20.5937, 78.9629], 5); // Center on India
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
  }).addTo(map);

  const markersLayer = L.layerGroup().addTo(map);
  let allComplaints = [];
  let refreshInterval;

  async function fetchComplaints() {
    try {
      const res = await fetch('/api/complaints');
      const data = await res.json();
      if (data.success) {
        allComplaints = data.data;
        updateLastUpdated();
        applyFilters();
      }
    } catch (err) {
      console.error('Failed loading complaints', err);
    }
  }

  function updateLastUpdated() {
    const lbl = document.getElementById('lastUpdatedLabel');
    if (lbl) lbl.textContent = `Last updated: ${new Date().toLocaleTimeString()}`;
  }

  function clearMarkers() {
    markersLayer.clearLayers();
  }

  function applyFilters() {
    clearMarkers();
    const search = (document.getElementById('searchInput')?.value || '').toLowerCase();
    const cat = document.getElementById('categoryFilter')?.value || '';
    const status = document.getElementById('statusFilter')?.value || '';

    const filtered = allComplaints.filter(c => {
      const matchSearch = !search || (c.issueType?.toLowerCase().includes(search) || c.description?.toLowerCase().includes(search));
      const matchCat = !cat || c.issueType === cat;
      const matchStatus = !status || c.status === status;
      return matchSearch && matchCat && matchStatus;
    });

    filtered.forEach(c => {
      if (c.latitude && c.longitude) {
        const m = L.marker([c.latitude, c.longitude]);
        m.bindPopup(`<strong>${c.issueType}</strong><br>${c.description || ''}<br>Status: ${c.status}<br>Ticket ID: ${c.ticketId || c.id}`);
        markersLayer.addLayer(m);
      }
    });
  }

  function startAutoRefresh() {
    stopAutoRefresh();
    refreshInterval = setInterval(fetchComplaints, 60000); // 60s
  }

  function stopAutoRefresh() {
    if (refreshInterval) {
      clearInterval(refreshInterval);
      refreshInterval = null;
    }
  }

  // --- Event bindings ---
  ['searchInput', 'categoryFilter', 'statusFilter'].forEach(id => {
    document.getElementById(id)?.addEventListener('input', applyFilters);
  });

  document.getElementById('autoRefreshToggle')?.addEventListener('change', e => {
    if (e.target.checked) startAutoRefresh(); else stopAutoRefresh();
  });

  // Initial load
  fetchComplaints();
  startAutoRefresh();
});
