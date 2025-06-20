document.addEventListener('DOMContentLoaded', async () => {
    const map = L.map('map').setView([20.5937, 78.9629], 5); // Center on India
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);
    try {
        const response = await fetch('/api/complaints');
        const data = await response.json();
        if (data.success && data.data.length) {
            data.data.forEach(complaint => {
                if (complaint.latitude && complaint.longitude) {
                    const marker = L.marker([complaint.latitude, complaint.longitude]).addTo(map);
                    marker.bindPopup(`<strong>${complaint.issueType}</strong><br>${complaint.description}<br>Status: ${complaint.status}<br>Ticket ID: ${complaint.ticketId}`);
                }
            });
        }
    } catch (error) {
        alert('Failed to load complaints for map.');
    }
}); 