document.addEventListener('DOMContentLoaded', async () => {
    const container = document.getElementById('myReportsContainer');
    if (!container) {
        console.error('Container element not found');
        return;
    }

    // Get user info
    const userId = localStorage.getItem('userId');
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    
    // Check if user is logged in
    if (!userId && !user?.email) {
        container.innerHTML = `
            <div class="alert alert-warning">
                <h4>Please log in</h4>
                <p>You need to be logged in to view your reports.</p>
                <a href="/login-signup" class="btn btn-primary">Log In / Sign Up</a>
            </div>`;
        return;
    }

    // Show loading state
    container.innerHTML = `
        <div class="text-center my-5">
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Loading...</span>
            </div>
            <p class="mt-2">Loading your reports...</p>
        </div>`;

    try {
        // Build query with fallback
        const query = userId 
            ? `userId=${encodeURIComponent(userId)}` 
            : `email=${encodeURIComponent(user.email)}`;
            
        console.log('Fetching reports with query:', query);
        
        const response = await fetch(`/api/complaints?${query}`);
        
        if (!response.ok) {
            throw new Error(`Server returned ${response.status}: ${response.statusText}`);
        }
        
        const result = await response.json();
        console.log('API response:', result);
        
        // Handle empty or invalid response
        if (!result || !result.data || !Array.isArray(result.data) || result.data.length === 0) {
            container.innerHTML = `
                <div class="alert alert-info">
                    <h4>No Reports Found</h4>
                    <p>You haven't submitted any reports yet.</p>
                    <a href="/report" class="btn btn-primary">Submit a Report</a>
                </div>`;
            return;
        }

        // Render reports
        let html = '<div class="row g-4">';
        
        result.data.forEach(report => {
            if (!report) return;
            
            const statusClass = {
                'New': 'bg-primary',
                'Pending': 'bg-warning',
                'In Progress': 'bg-info',
                'Resolved': 'bg-success'
            }[report.status] || 'bg-secondary';
            
            html += `
            <div class="col-12 col-md-6 col-lg-4">
                <div class="card h-100 shadow-sm">
                    <div class="card-header d-flex justify-content-between align-items-center">
                        <h5 class="mb-0">${report.issueType || 'Unknown Issue'}</h5>
                        <span class="badge ${statusClass}">${report.status || 'Unknown'}</span>
                    </div>
                    <div class="card-body">
                        ${report.description ? `<p class="card-text">${report.description}</p>` : ''}
                        ${report.address ? `<p class="text-muted"><i class="bi bi-geo-alt"></i> ${report.address}</p>` : ''}
                    </div>
                    <div class="card-footer bg-transparent">
                        <div class="d-flex justify-content-between align-items-center">
                            <small class="text-muted">
                                ${report.createdAt ? new Date(report.createdAt).toLocaleDateString() : 'Date unknown'}
                            </small>
                            <small>
                                <strong>Ticket ID:</strong> ${report.ticketId || report.id || 'N/A'}
                            </small>
                        </div>
                    </div>
                </div>
            </div>`;
        });
        
        html += '</div>';
        container.innerHTML = html;
        
    } catch (error) {
        console.error('Error loading reports:', error);
        container.innerHTML = `
            <div class="alert alert-danger">
                <h4>Failed to Load Reports</h4>
                <p>${error.message || 'An error occurred while loading your reports.'}</p>
                <button onclick="window.location.reload()" class="btn btn-outline-danger">
                    Try Again
                </button>
            </div>`;
    }
});