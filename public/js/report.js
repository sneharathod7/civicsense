/* -------------------------------------------------
   CivicVerse New Report Page Script (Heading 12)
   Rewritten 2025-06-25
--------------------------------------------------*/
(function () {
  // --- Category Selection Elements ---
  const categoryDropdownBtn = document.getElementById('categoryDropdown');
  const categoryMenu        = document.getElementById('categoryMenu');
  const categoryIcons       = document.querySelectorAll('.category-icon');
  let   selectedCategory    = null;

  function setCategory(val, labelHtml) {
    selectedCategory = val;
    categoryDropdownBtn.innerHTML = labelHtml + ' ▼';
    // highlight dropdown
    [...categoryMenu.querySelectorAll('.dropdown-item')].forEach(i => i.classList.toggle('active', i.dataset.value === val));
    // highlight icon grid
    categoryIcons.forEach(btn => btn.classList.toggle('selected', btn.dataset.value === val));
  }

  categoryMenu.addEventListener('click', e => {
    const item = e.target.closest('.dropdown-item');
    if (!item) return;
    e.preventDefault();
    setCategory(item.dataset.value, item.innerHTML.trim());
  });
  categoryIcons.forEach(btn => btn.addEventListener('click', () => {
    const emoji = btn.querySelector('span').outerHTML;
    setCategory(btn.dataset.value, `${emoji} ${btn.textContent.trim()}`);
  }));

  // --- Map & Location ---
  const mapEl           = document.getElementById('map');
  const currentLocP     = document.getElementById('currentLocation');
  const confirmLocBtn   = document.getElementById('confirmLocation');
  const adjustLocBtn    = document.getElementById('adjustLocation');
  let map, marker, currentCoords;

  function updateLocText() {
    if (!currentCoords) return;
    const { lat, lng } = currentCoords;
    currentLocP.textContent = `📍 Current: (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
    document.getElementById('aiGps').textContent = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    // Reverse-geocode to human-readable address
    const addrInput = document.getElementById('addressBox');
    if (addrInput) {
      fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`)
        .then(r => r.json())
        .then(d => { addrInput.value = d.display_name || `${lat.toFixed(4)}, ${lng.toFixed(4)}`; })
        .catch(() => {});
    }
  }

  function initMap() {
    map = L.map(mapEl).setView([28.4595, 77.0266], 14);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap' }).addTo(map);
    marker = L.marker([28.4595, 77.0266], { draggable: true }).addTo(map);
    marker.on('dragend', () => { currentCoords = marker.getLatLng(); updateLocText(); });

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(pos => {
        currentCoords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        marker.setLatLng(currentCoords);
        map.setView(currentCoords, 15);
        updateLocText();
      }, updateLocText);
    } else updateLocText();
  }

  confirmLocBtn.addEventListener('click', () => {
    if (!currentCoords) return alert('Location not set');
    confirmLocBtn.textContent = 'Location Confirmed ✅';
    confirmLocBtn.classList.replace('btn-success', 'btn-outline-success');
  });
  adjustLocBtn.addEventListener('click', () => {
    alert('Tap a point on the map to choose new location');
    map.once('click', e => { marker.setLatLng(e.latlng); currentCoords = e.latlng; updateLocText(); });
  });

  // --- Image Upload & AI analysis placeholder ---
  const cameraBtn   = document.getElementById('cameraUpload');
  const galleryBtn  = document.getElementById('galleryUpload');
  const hiddenFile  = document.getElementById('hiddenFileInput');
  const previewDiv  = document.getElementById('imagePreview');
  const aiCard      = document.getElementById('aiResults');
  const aiIssueSpan = document.getElementById('aiIssueType');
  const aiCatSpan   = document.getElementById('aiCategory');
  const aiPriority  = document.getElementById('aiPriority');
  const aiDescTA    = document.getElementById('aiDescription');
  document.getElementById('acceptAi').addEventListener('click', () => { aiDescTA.readOnly = true; });
  document.getElementById('editDescription').addEventListener('click', () => { aiDescTA.readOnly = false; aiDescTA.focus(); });

  function triggerPick(camera=false){
    if(camera) hiddenFile.setAttribute('capture','environment'); else hiddenFile.removeAttribute('capture');
    hiddenFile.click();
  }
  cameraBtn.addEventListener('click',()=>triggerPick(true));
  galleryBtn.addEventListener('click',()=>triggerPick(false));
  hiddenFile.addEventListener('change',()=>{
    const file = hiddenFile.files[0];
    if(!file) return;
    previewDiv.innerHTML = `<img src="${URL.createObjectURL(file)}" class="img-fluid rounded" style="max-height:250px;">`;
    // mock AI
    aiIssueSpan.textContent='Pothole';
    aiCatSpan.textContent='Roads';
    aiPriority.textContent='Medium';
    aiDescTA.value='AI-generated issue description.';
    aiCard.classList.remove('d-none');
  });

  // --- Submission actions ---
  function collectState(action){
    return {
      action,
      category: selectedCategory,
      coords: currentCoords,
      address: document.getElementById('addressBox').value,
      extraAddr: document.getElementById('additionalAddress').value,
      description: aiDescTA.value,
      notifyEmail: document.getElementById('notifyEmail').checked,
      notifySms: document.getElementById('notifySms').checked,
      anonymous: document.getElementById('identityToggle').checked
    };
  }
  
  document.getElementById('previewReport').addEventListener('click', () => {
    const previewData = collectState('preview');
    console.log('Preview:', previewData);
    // Show preview in a modal or preview panel
    alert('Preview generated (check console)');
  });

  document.getElementById('submitReport').addEventListener('click', () => {
    const formData = collectState('submit');
    console.log('Submitting report:', formData);
    
    // Generate a unique report ID (in a real app, this would come from the server)
    const reportId = 'RPT-' + Math.random().toString(36).substr(2, 9).toUpperCase();
    
    // Format the data for URL parameters
    const params = new URLSearchParams({
      id: reportId,
      category: formData.category || 'general',
      description: encodeURIComponent(formData.description || ''),
      address: encodeURIComponent(formData.address || ''),
      lat: formData.coords ? formData.coords.lat.toFixed(6) : '',
      lng: formData.coords ? formData.coords.lng.toFixed(6) : '',
      timestamp: new Date().toISOString(),
      status: 'submitted'
    });
    
    // Redirect to success page with report data
    window.location.href = `/report-success.html?${params.toString()}`;
  });

  // init everything after DOM ready
  document.addEventListener('DOMContentLoaded', initMap);
})();

// ---- Legacy code below retained ----

// Initialize map
let map;
let marker;
let currentLocation;

// Initialize map when the page loads
document.addEventListener('DOMContentLoaded', () => {
    initMap();
    setupFormHandlers();
    setupPhotoHandlers();
});

// Initialize the map
function initMap() {
    // Create map centered at a default location
    map = L.map('map').setView([0, 0], 2);
    
    // Add OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    // Try to get user's location
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            position => {
                const { latitude, longitude } = position.coords;
                currentLocation = { latitude, longitude };
                
                // Update map view
                map.setView([latitude, longitude], 15);
                
                // Add marker
                marker = L.marker([latitude, longitude]).addTo(map);
                
                // Update form fields
                document.getElementById('latitude').value = latitude;
                document.getElementById('longitude').value = longitude;
                
                // Get address from coordinates
                getAddressFromCoordinates(latitude, longitude);
            },
            error => {
                console.error('Error getting location:', error);
                alert('Unable to get your location. Please enable location services.');
            }
        );
    }

    // Handle map clicks
    map.on('click', e => {
        const { lat, lng } = e.latlng;
        
        // Update marker position
        if (marker) {
            marker.setLatLng([lat, lng]);
        } else {
            marker = L.marker([lat, lng]).addTo(map);
        }
        
        // Update form fields
        document.getElementById('latitude').value = lat;
        document.getElementById('longitude').value = lng;
        
        // Get address from coordinates
        getAddressFromCoordinates(lat, lng);
    });
}

// Get address from coordinates using Nominatim
async function getAddressFromCoordinates(lat, lng) {
    try {
        const response = await fetch(`/api/reverse-geocode?lat=${lat}&lon=${lng}`);
        const data = await response.json();
        document.getElementById('address').value = data.display_name;
    } catch (error) {
        console.error('Error getting address:', error);
    }
}

// Setup form handlers
function setupFormHandlers() {
    const form = document.getElementById('reportForm');
    const issueTypeSelect = document.getElementById('issueType');
    
    // Handle form submission
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // Show loading state
        const submitButton = form.querySelector('button[type="submit"]');
        const originalText = submitButton.innerHTML;
        submitButton.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Submitting...';
        submitButton.disabled = true;
        
        try {
            // Create FormData object
            const formData = new FormData(form);
            // Attach userId so backend can link complaint to user
            const storedUserId = localStorage.getItem('userId');
            if (storedUserId) {
                formData.append('userId', storedUserId);
            }
            // Log FormData content
            for (let pair of formData.entries()) {
                console.log('FormData:', pair[0], pair[1]);
            }
            // Send to server
            const response = await fetch('/api/complaints', {
                method: 'POST',
                body: formData
            });
            console.log('Response status:', response.status);
            if (!response.ok) {
                const errorText = await response.text();
                console.error('Failed to submit report. Response:', errorText);
                throw new Error('Failed to submit report');
            }
            const data = await response.json();
            console.log('Submission success:', data);
            // Show success message
            alert('Report submitted successfully! Your ticket ID is: ' + data.data.ticketId);
            // Reset form
            form.reset();
            document.getElementById('photoPreview').innerHTML = '';
            document.getElementById('department').value = '';
        } catch (error) {
            console.error('Error submitting report:', error);
            alert('Failed to submit report. Please try again.');
        } finally {
            // Reset button state
            submitButton.innerHTML = originalText;
            submitButton.disabled = false;
        }
    });
    
    // Handle issue type change
    issueTypeSelect.addEventListener('change', () => {
        predictDepartment();
    });
}

// Setup photo handlers
function setupPhotoHandlers() {
    const photoInput = document.getElementById('photo');
    const captureButton = document.getElementById('capturePhoto');
    const photoPreview = document.getElementById('photoPreview');
    
    // Handle file input change
    photoInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            displayPhotoPreview(file);
            predictDepartment();
        }
    });
    
    // Handle photo capture
    captureButton.addEventListener('click', () => {
        // Check if browser supports getUserMedia
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            // Create video element
            const video = document.createElement('video');
            video.style.display = 'none';
            document.body.appendChild(video);
            
            // Get camera stream
            navigator.mediaDevices.getUserMedia({ video: true })
                .then(stream => {
                    video.srcObject = stream;
                    video.play();
                    
                    // Create canvas for capturing
                    const canvas = document.createElement('canvas');
                    canvas.width = video.videoWidth;
                    canvas.height = video.videoHeight;
                    
                    // Draw video frame to canvas
                    const context = canvas.getContext('2d');
                    context.drawImage(video, 0, 0, canvas.width, canvas.height);
                    
                    // Convert to blob
                    canvas.toBlob(blob => {
                        // Create file from blob
                        const file = new File([blob], 'photo.jpg', { type: 'image/jpeg' });
                        
                        // Update file input
                        const dataTransfer = new DataTransfer();
                        dataTransfer.items.add(file);
                        photoInput.files = dataTransfer.files;
                        
                        // Display preview
                        displayPhotoPreview(file);
                        
                        // Predict department
                        predictDepartment();
                        
                        // Stop camera stream
                        stream.getTracks().forEach(track => track.stop());
                        video.remove();
                    }, 'image/jpeg');
                })
                .catch(error => {
                    console.error('Error accessing camera:', error);
                    alert('Unable to access camera. Please upload a photo instead.');
                });
        } else {
            alert('Your browser does not support camera access. Please upload a photo instead.');
        }
    });
}

// Display photo preview
function displayPhotoPreview(file) {
    const reader = new FileReader();
    const photoPreview = document.getElementById('photoPreview');
    
    reader.onload = (e) => {
        photoPreview.innerHTML = `
            <img src="${e.target.result}" class="img-fluid rounded" style="max-height: 200px;">
        `;
    };
    
    reader.readAsDataURL(file);
}

// Predict department using ML model
async function predictDepartment() {
    const issueType = document.getElementById('issueType').value;
    const photoInput = document.getElementById('photo');
    const latitude = document.getElementById('latitude').value;
    const longitude = document.getElementById('longitude').value;
    
    if (!issueType || !photoInput.files[0] || !latitude || !longitude) {
        return;
    }
    
    try {
        const formData = new FormData();
        formData.append('photo', photoInput.files[0]);
        formData.append('issue_type', issueType);
        formData.append('latitude', latitude);
        formData.append('longitude', longitude);
        
        const response = await fetch('/api/predict-department', {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            throw new Error('Failed to predict department');
        }
        
        const data = await response.json();
        document.getElementById('department').value = data.department;
        
    } catch (error) {
        console.error('Error predicting department:', error);
    }
} 