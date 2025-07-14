// apiBase.js
// Ensures all fetch requests that target /api/* are sent to the admin backend on port 3005
(function() {
  const isLocalDev = /localhost|127\.0\.0\.1/.test(window.location.hostname);
  const ADMIN_BASE_ORIGIN = isLocalDev ? 'http://localhost:3005' : window.location.origin;
  if (!window.fetch) return; // Fail-safe

  const originalFetch = window.fetch.bind(window);

  window.fetch = function(resource, init) {
    try {
      if (typeof resource === 'string') {
        if (resource.startsWith('/api/')) {
          resource = `${ADMIN_BASE_ORIGIN}${resource}`;
        } else if (resource.startsWith('api/')) {
          resource = `${ADMIN_BASE_ORIGIN}/${resource}`;
        }
      } else if (resource instanceof Request) {
        let url = resource.url;
        if (url.startsWith('/api/')) {
          url = `${ADMIN_BASE_ORIGIN}${url}`;
          resource = new Request(url, resource);
        } else if (url.startsWith('api/')) {
          url = `${ADMIN_BASE_ORIGIN}/${url}`;
          resource = new Request(url, resource);
        }
      }
    } catch (e) {
      // If something goes wrong, fallback to original fetch without modification
      console.error('[apiBase] Error patching fetch:', e);
    }
    return originalFetch(resource, init);
  };
})();
