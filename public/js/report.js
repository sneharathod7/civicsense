/* -------------------------------------------------
   CivicSense Report Page - Main Script
   Last Updated: 2025-06-29
   Features:
   - Dynamic geolocation with Leaflet map
   - Image upload from camera/gallery
   - Form validation and submission
   - Responsive design
--------------------------------------------------*/

(function() {
  // UTILITIES
  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => document.querySelectorAll(selector);
  
  // GLOBAL STATE
  let selectedCategory = null;
  let currentCoords = null;
  let map = null;
  let marker = null;
  let selectedImages = []; // Store uploaded images
  
  // DEBUG: Check if map container exists
  function checkMapContainer() {
    const mapElement = document.getElementById('map');
    if (!mapElement) {
      console.error('Map container not found. Make sure you have an element with id="map" in your HTML');
      return false;
    }
    if (mapElement.offsetWidth === 0 || mapElement.offsetHeight === 0) {
      console.warn('Map container has zero dimensions. Check CSS or parent container visibility');
    }
    return true;
  }

  // Test function to check map status
  function testMapStatus() {
    console.log('--- MAP STATUS ---');
    console.log('Map element exists:', !!document.getElementById('map'));
    console.log('Leaflet loaded:', typeof L !== 'undefined');
    console.log('Map instance:', map ? 'Initialized' : 'Not initialized');
    console.log('Marker instance:', marker ? 'Initialized' : 'Not initialized');
    
    if (map) {
      console.log('Map center:', map.getCenter());
      console.log('Map zoom:', map.getZoom());
    }
    
    if (marker) {
      console.log('Marker position:', marker.getLatLng());
    }
    
    console.log('Current coordinates:', currentCoords);
    console.log('--- END MAP STATUS ---');
  }

  // INITIALIZATION
  function mainInit() {
    console.log('Initializing report page...');
    
    // Check if map container exists first
    if (!checkMapContainer()) {
      alert('Map container not found. The page may not load correctly.');
    }
    
    // Initialize map first as it's most critical
    console.log('Initializing map...');
    initMap();
    
    // Then initialize other components
    console.log('Initializing category selection...');
    initCategorySelection();
    console.log('Initializing image upload...');
    initImageUpload();
    console.log('Initializing form submission...');
    initFormSubmission();
    console.log('Initializing theme switcher...');
    initThemeSwitcher();
    
    console.log('Report page initialized');
    
    // Add manual location button for testing
    const locationButton = document.createElement('button');
    locationButton.textContent = 'Test Location (0,0)';
    locationButton.style.position = 'fixed';
    locationButton.style.bottom = '10px';
    locationButton.style.right = '10px';
    locationButton.style.zIndex = '1000';
    locationButton.onclick = () => {
      console.log('Test location button clicked');
      currentCoords = { lat: 0, lng: 0 };
      updateMarkerPosition(0, 0);
      updateLocationText();
    };
    document.body.appendChild(locationButton);
    
    // Add test button
    const testButton = document.createElement('button');
    testButton.textContent = 'Test Map Status';
    testButton.style.position = 'fixed';
    testButton.style.bottom = '50px';
    testButton.style.right = '10px';
    testButton.style.zIndex = '1000';
    testButton.onclick = testMapStatus;
    document.body.appendChild(testButton);
    
    // Initial test
    setTimeout(testMapStatus, 2000);
  }

  // Run init when DOM ready; handle case where script is loaded after DOMContentLoaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mainInit);
  } else {
    // DOM already parsed
    mainInit();
  }
  
  // MAP FUNCTIONS
  function initMap() {
    console.log('Initializing map...');
    // Default to center of India if geolocation fails
    const defaultLocation = { lat: 20.5937, lng: 78.9629 };
    
    try {
      // Initialize map
      const mapElement = document.getElementById('map');
      if (!mapElement) {
        console.error('Map container not found');
        return;
      }
      
      // Check if Leaflet is loaded
      if (typeof L === 'undefined') {
        console.error('Leaflet is not loaded');
        return;
      }
      
      // Initialize map with options
      map = L.map('map', {
        center: [defaultLocation.lat, defaultLocation.lng],
        zoom: 15,
        zoomControl: true
      });
      
      console.log('Map initialized, adding tiles...');
      
      // Add OpenStreetMap tiles with error handling
      try {
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors',
          crossOrigin: true
        }).addTo(map);
        console.log('Tiles added successfully');
      } catch (tileError) {
        console.error('Error adding tiles:', tileError);
      }
      
      // Initialize marker
      try {
        console.log('Creating marker at:', defaultLocation);
        marker = L.marker(
          [defaultLocation.lat, defaultLocation.lng], 
          { draggable: true }
        ).addTo(map);
        
        console.log('Marker created, binding events...');
        
        // Update coordinates when marker is dragged
        marker.on('dragend', function() {
          const pos = this.getLatLng();
          console.log('Marker dragged to:', pos);
          currentCoords = { lat: pos.lat, lng: pos.lng };
          updateLocationText();
        });
        
        // Set initial coordinates
        currentCoords = { ...defaultLocation };
        updateLocationText();
        
        console.log('Marker initialized successfully');
      } catch (markerError) {
        console.error('Failed to initialize marker:', markerError);
        // Try to recover by creating a simple marker
        try {
          marker = L.marker([defaultLocation.lat, defaultLocation.lng]).addTo(map);
          console.log('Simple marker created as fallback');
        } catch (e) {
          console.error('Could not create fallback marker:', e);
        }
      }
      
      // Handle map click
      map.on('click', (e) => {
        const { lat, lng } = e.latlng;
        currentCoords = { lat, lng };
        updateMarkerPosition(lat, lng);
        updateLocationText();
      });
      
      // Try to get user's location
      getUserLocation();
      
    } catch (error) {
      console.error('Error initializing map:', error);
      alert('Error initializing map. Please refresh the page.');
    }
  }
  
  function getUserLocation() {
    const statusElement = $('#locationStatus');
    const locationButton = $('#getLocationBtn');
    
    // Helper function to update status
    const updateStatus = (message, type = 'info') => {
      if (!statusElement) return;
      statusElement.textContent = message;
      statusElement.className = `text-${type}`;
      statusElement.style.display = 'block';
      
      // Show/hide retry button
      if (locationButton) {
        locationButton.style.display = type === 'error' ? 'inline-block' : 'none';
      }
    };

    // Check if geolocation is supported
    if (!navigator.geolocation) {
      updateStatus('Geolocation is not supported by your browser', 'danger');
      return;
    }
    
    // Show loading state
    updateStatus('Getting your location...', 'info');
    
    // Set timeout for geolocation request
    const geoTimeout = setTimeout(() => {
      updateStatus('Taking longer than expected to get your location...', 'warning');
    }, 5000);

    // Get current position
    navigator.geolocation.getCurrentPosition(
      // Success callback
      (position) => {
        clearTimeout(geoTimeout);
        const { latitude, longitude, accuracy } = position.coords;
        currentCoords = { lat: latitude, lng: longitude };
        
        // Update map and UI
        updateMarkerPosition(latitude, longitude);
        updateLocationText();
        
        // Update status with accuracy info
        updateStatus(
          `Location found! (Accuracy: ${Math.round(accuracy)} meters) Drag the marker to adjust.`,
          'success'
        );
      },
      // Error callback
      (error) => {
        clearTimeout(geoTimeout);
        console.error('Geolocation error:', error);
        
        let message = 'Could not get your location. ';
        switch(error.code) {
          case error.PERMISSION_DENIED:
            message = 'Location access was denied. Please enable it in your browser settings and try again.';
            break;
          case error.POSITION_UNAVAILABLE:
            message = 'Location information is unavailable. Please check your connection and try again.';
            break;
          case error.TIMEOUT:
            message = 'The request to get location timed out. Please try again.';
            break;
          default:
            message = 'An unknown error occurred while getting your location.';
        }
        
        updateStatus(message, 'danger');
      },
      // Options
      {
        enableHighAccuracy: true,  // Try to use GPS if available
        timeout: 15000,           // 15 seconds timeout
        maximumAge: 0             // Don't use a cached position
      }
    );
    
    // Handle retry button click
    if (locationButton) {
      locationButton.onclick = (e) => {
        e.preventDefault();
        getUserLocation();
      };
    }
  }
  
  function updateMarkerPosition(lat, lng) {
    console.log('Updating marker position to:', lat, lng);
    if (!marker) {
      console.error('Marker is not initialized');
      return;
    }
    if (!map) {
      console.error('Map is not initialized');
      return;
    }
    try {
      marker.setLatLng([lat, lng]);
      map.setView([lat, lng], 17);
      console.log('Marker and map position updated successfully');
    } catch (error) {
      console.error('Error updating marker position:', error);
    }
  }
  
  async function updateLocationText() {
    if (!currentCoords) return;
    
    const { lat, lng } = currentCoords;
    const coordText = `Lat: ${lat.toFixed(6)}, Lng: ${lng.toFixed(6)}`;
    
    // Update coordinates display
    const coordElement = $('#currentLocation');
    if (coordElement) {
      coordElement.textContent = `📍 ${coordText}`;
    }
    
    const addressElement = $('#addressBox');
    if (!addressElement) return;
    
    // Show loading state
    addressElement.placeholder = 'Getting address...';
    
    try {
      // Simple reverse geocoding using OpenStreetMap's Nominatim
      // Note: This is a simplified version that might have rate limits
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
        {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'CivicSense/1.0 (your-email@example.com)'
          },
          mode: 'cors' // Explicitly enable CORS
        }
      );
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.display_name) {
        addressElement.value = data.display_name;
      } else {
        addressElement.value = 'Address not found';
      }
    } catch (error) {
      console.error('Error getting address:', error);
      // Fall back to coordinates if address lookup fails
      addressElement.value = coordText;
      addressElement.placeholder = 'Could not get address. Using coordinates instead.';
      
      // In development, you can uncomment this to see the actual error
      // addressElement.placeholder = `Error: ${error.message}`;
    }
  }
  
  // CATEGORY SELECTION
  function initCategorySelection() {
    const dropdownBtn = $('#categoryDropdown');
    const dropdownMenu = $('#categoryMenu');
    const iconButtons = $$('.category-icon');
    
    if (!dropdownMenu || !iconButtons.length) return;
    
    function setCategory(value, label) {
      selectedCategory = value;
      
      // Update the hidden input field
      const categoryInput = document.getElementById('selectedCategory');
      if (categoryInput) {
        categoryInput.value = value;
      }
      
      // Update UI
      iconButtons.forEach(btn => {
        btn.classList.toggle('selected', btn.dataset.value === value);
      });
      
      const dropdownItems = dropdownMenu.querySelectorAll('.dropdown-item');
      dropdownItems.forEach(item => {
        item.classList.toggle('active', item.dataset.value === value);
      });
      
      if (dropdownBtn) {
        // Try to get the icon from the clicked button or find it in the DOM
        const iconElement = $(`[data-value="${value}"] i`);
        let iconHtml = '';
        
        if (iconElement) {
          // Clone the icon if found
          const icon = iconElement.cloneNode(true);
          iconHtml = icon.outerHTML + ' ';
        } else {
          // Fallback to a default icon
          iconHtml = '<i class="fas fa-map-marker-alt"></i> ';
        }
        
        // Update dropdown button content
        dropdownBtn.innerHTML = `${iconHtml}${label} ▼`;
      }
    }
    
    // Handle dropdown selection
    dropdownMenu.addEventListener('click', (e) => {
      const item = e.target.closest('.dropdown-item');
      if (!item) return;
      
      e.preventDefault();
      setCategory(item.dataset.value, item.textContent.trim());
    });
    
    // Handle icon selection
    iconButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const value = btn.dataset.value;
        const label = btn.textContent.trim();
        setCategory(value, label);
      });
    });
    
    // Highlight active dropdown item based on current selection
    const dropdownItems = dropdownMenu.querySelectorAll('.dropdown-item');
    dropdownItems.forEach(item => {
      item.classList.toggle('active', item.dataset.value === selectedCategory);
    });
  }
  
  // FORM SUBMISSION
  function initFormSubmission() {
    const form = document.getElementById('reportForm');
    if (!form) return;
    
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      // Validate required fields
      const categoryInput = document.getElementById('selectedCategory');
      const descriptionInput = document.getElementById('aiDescription');
      const addressInput = document.getElementById('addressBox');
      
      if (!categoryInput?.value) {
        alert('Please select a category');
        return;
      }
      
      if (!addressInput?.value?.trim()) {
        alert('Please select a location on the map');
        addressInput.focus();
        return;
      }
      
      if (!descriptionInput?.value?.trim()) {
        alert('Please provide a description');
        descriptionInput.focus();
        return;
      }
      
      const submitBtn = form.querySelector('button[type="submit"]');
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Submitting...';

      try {
        const data = {
          title: 'Civic Issue Report',
          description: descriptionInput.value,
          category: categoryInput.value,
          location: {
            type: 'Point',
            coordinates: currentCoords ? [currentCoords.lng, currentCoords.lat] : [0, 0],
            address: addressInput.value || 'Not provided'
          },
          images: selectedImages.map(img => img.preview),
          userEmail: JSON.parse(localStorage.getItem('user')).email,
          userMobile: JSON.parse(localStorage.getItem('user')).mobile || ''
        };

        // Get JWT token from localStorage
        const token = localStorage.getItem('token');

        const response = await fetch('/api/reports', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': 'Bearer ' + token } : {})
          },
          body: JSON.stringify(data),
        });

        const result = await response.json();

        if (result.success) {
          alert('Report submitted successfully!');
          form.reset();
          const previewWrapperEl = document.getElementById('previewWrapper');
          const previewImageEl = document.getElementById('previewImage');
          const aiCardEl = document.getElementById('aiCard');
          if (previewImageEl) previewImageEl.src = '';
          if (previewWrapperEl) previewWrapperEl.classList.add('d-none');
          if (aiCardEl) aiCardEl.classList.add('d-none');
          selectedImages = [];
          if (map) {
            map.setView([20.5937, 78.9629], 5);
          }
        } else {
          alert(`Submission failed: ${result.message || 'Unknown error'}`);
        }
      } catch (err) {
        console.error('Error submitting report:', err);
        alert('A client-side error occurred. Please try again.');
      } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = 'Submit Report';
      }
    });
  }

  // IMAGE UPLOAD (label + input approach – no programmatic clicks needed)
  function initImageUpload() {
    console.log('initImageUpload: Function started.');
    const cameraInput = document.getElementById('cameraInput');
    const galleryInput = document.getElementById('galleryInput');
    const previewWrapper = document.getElementById('previewWrapper');
    const previewImage = document.getElementById('previewImage');
    const aiCard = document.getElementById('aiCard');
    // AI results elements
    const aiIssueType = document.getElementById('aiIssueType');
    const aiCategory = document.getElementById('aiCategory');
    const aiGps = document.getElementById('aiGps');
    const aiPriority = document.getElementById('aiPriority');
    const aiDescription = document.getElementById('aiDescription');

    // Array to hold selected images
    let selectedImages = [];
    
    if (!cameraInput && !galleryInput) {
      console.warn('initImageUpload: No file inputs found');
      return;
    }

    
    // Function to update the image preview
    function updateImagePreview() {
      if (selectedImages.length > 0) {
        const image = selectedImages[0];
        if (previewImage) {
          previewImage.src = image.preview;
        }
        if (previewWrapper) {
          previewWrapper.classList.remove('d-none');
        }
        
        // Handle remove image button
        const removeBtn = document.getElementById('removeImage');
        if (removeBtn) {
          removeBtn.addEventListener('click', () => {
            selectedImages = [];
            if (previewImage) previewImage.src = '';
            if (previewWrapper) previewWrapper.classList.add('d-none');
            if (cameraInput) cameraInput.value = '';
            if (galleryInput) galleryInput.value = '';
            if (aiCard) aiCard.classList.add('d-none');
          });
        }
      } else {
        if (previewWrapper) previewWrapper.classList.add('d-none');
        if (previewWrapper) previewWrapper.innerHTML = '';
      }
    }
    
    function handleFileSelect(event) {
      console.log('handleFileSelect fired');
      const file = event.target.files[0];
      if (!file) return;
      
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file (JPEG, PNG, etc.)');
        return;
      }
      
      const reader = new FileReader();
      
      reader.onload = function(e) {
        // Add to selected images
        selectedImages = [{
          file: file,
          preview: e.target.result
        }];
        
        // Update preview
        updateImagePreview();
        
        // Show AI results section
        if (aiCard) {
          aiCard.classList.remove('d-none');
        }

        // Simulate AI analysis delay
        setTimeout(() => {
          if (aiIssueType) aiIssueType.textContent = 'Road Infrastructure';
          if (aiCategory) aiCategory.textContent = selectedCategory || 'Pothole';
          if (aiGps) aiGps.textContent = currentCoords ? `${currentCoords.lat.toFixed(6)}, ${currentCoords.lng.toFixed(6)}` : 'Not available';
          if (aiPriority) aiPriority.textContent = 'High';
          if (aiDescription) {
            aiDescription.value = `Auto-generated description for ${selectedCategory || 'pothole'} at ${currentCoords ? `${currentCoords.lat.toFixed(6)}, ${currentCoords.lng.toFixed(6)}` : 'unknown location'}`;
          }
        }, 500);
      };
      reader.readAsDataURL(file);
    }

  // Bind change listeners
  [cameraInput, galleryInput].forEach(input => {
    if (input) {
      console.log('Attaching change listener to', input.id);
      input.addEventListener('change', handleFileSelect);
    }
  });

  // Expose helper for other modules/tests
  window.updateImagePreview = updateImagePreview;
}

// THEME SWITCHER
function initThemeSwitcher() {
  // ... (rest of the code remains the same)
    if (!themeSwitch) return;
    
    // Load saved theme preference
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.body.setAttribute('data-bs-theme', savedTheme);
    themeSwitch.checked = savedTheme === 'dark';
    
    // Handle theme switch
    themeSwitch.addEventListener('change', (e) => {
      const theme = e.target.checked ? 'dark' : 'light';
      document.body.setAttribute('data-bs-theme', theme);
      localStorage.setItem('theme', theme);
    });
  }
})();

document.addEventListener('DOMContentLoaded', async () => {
  // Check authentication
  const token = localStorage.getItem('token');
  if (!token) {
    window.location.href = '/citizen-login.html';
    return;
  }

  // Initialize user data and avatar first
  await initializeUserData();
  
  // Setup event listeners
  setupEventListeners();
  
  // Initialize map and other components
  initMap();
  initCategorySelection();
  initImageUpload();
  initFormSubmission();
});

async function initializeUserData() {
  try {
    const response = await fetch('/api/v1/auth/me', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch user data');
    }

    const { data } = await response.json();
    
    // Update user info in header
    document.getElementById('ddUserName').textContent = `${data.firstName} ${data.lastName}`;
    document.getElementById('ddUserEmail').textContent = data.email;

    // Update avatar
    updateAvatarDisplay(data.photo, data.firstName, data.lastName);

    // Store user data in localStorage
    localStorage.setItem('user', JSON.stringify(data));
    localStorage.setItem('userId', data._id);

  } catch (error) {
    console.error('Error fetching user data:', error);
    showMessage('Failed to load user data', true);
  }
}

function updateAvatarDisplay(photoUrl, firstName, lastName) {
  const userAvatar = document.getElementById('userAvatar');
  
  if (photoUrl) {
    // If there's a photo URL, use it
    userAvatar.src = `/uploads/${photoUrl}`;
  } else if (firstName && lastName) {
    // If no photo but we have a name, use initials
    const initialsUrl = generateInitialsAvatar(firstName, lastName);
    userAvatar.src = initialsUrl;
  }
}

function generateInitialsAvatar(firstName, lastName) {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  canvas.width = 200;
  canvas.height = 200;

  // Draw background
  context.fillStyle = '#0d6efd';
  context.fillRect(0, 0, canvas.width, canvas.height);

  // Draw text
  context.font = 'bold 80px Arial';
  context.fillStyle = 'white';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`;
  context.fillText(initials, canvas.width/2, canvas.height/2);

  return canvas.toDataURL('image/png');
}

function setupEventListeners() {
  // Logout handler
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', (e) => {
      e.preventDefault();
      localStorage.clear();
      window.location.href = '/citizen-login.html';
    });
  }

  // Theme switch handler
  const themeSwitch = document.getElementById('themeSwitch');
  if (themeSwitch) {
    const currentTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-bs-theme', currentTheme);
    themeSwitch.checked = currentTheme === 'dark';
    updateThemeIcon(themeSwitch.checked);

    themeSwitch.addEventListener('change', () => {
      const isDark = themeSwitch.checked;
      document.documentElement.setAttribute('data-bs-theme', isDark ? 'dark' : 'light');
      localStorage.setItem('theme', isDark ? 'dark' : 'light');
      updateThemeIcon(isDark);
    });
  }
}

function updateThemeIcon(isDark) {
  const icon = document.querySelector('#themeSwitch + label i');
  if (isDark) {
    icon.classList.remove('fa-moon');
    icon.classList.add('fa-sun');
  } else {
    icon.classList.remove('fa-sun');
    icon.classList.add('fa-moon');
  }
}

function showMessage(message, isError = false) {
  // You can implement this based on your UI needs
  console.log(isError ? 'Error: ' : 'Message: ', message);
}
