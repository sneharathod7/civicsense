document.addEventListener('DOMContentLoaded', async () => {
    const userId = 1; // Replace with dynamic user ID if available
    const container = document.getElementById('myReportsContainer');
    container.innerHTML = '<div class="text-center"><div class="spinner-border"></div> Loading...</div>';
    try {
        const response = await fetch(`/api/complaints?userId=${userId}`);
        const data = await response.json();
        if (!data.success || !data.data.length) {
            container.innerHTML = '<div class="alert alert-info">No reports found.</div>';
            return;
        }
        let html = '<div class="row">';
        data.data.forEach(report => {
            html += `<div class="col-md-4 mb-3"><div class="card h-100"><div class="card-body">
                <h5 class="card-title">${report.issueType}</h5>
                <p class="card-text">${report.description}</p>
                <p><strong>Status:</strong> ${report.status}</p>
                <p><strong>Ticket ID:</strong> ${report.ticketId}</p>
                <p><strong>Date:</strong> ${new Date(report.createdAt).toLocaleString()}</p>
            </div></div></div>`;
        });
        html += '</div>';
        container.innerHTML = html;
    } catch (error) {
        container.innerHTML = '<div class="alert alert-danger">Failed to load reports.</div>';
    }
}); 