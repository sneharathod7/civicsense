// Profile Page JavaScript

document.addEventListener('DOMContentLoaded', function() {
  // Initialize tooltips
  const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
  tooltipTriggerList.map(function (tooltipTriggerEl) {
    return new bootstrap.Tooltip(tooltipTriggerEl);
  });

  // DOM Elements
  const editProfileBtn = document.getElementById('editProfileBtn');
  const saveProfileBtn = document.getElementById('saveProfileBtn');
  const avatarUploadBtn = document.getElementById('avatarUploadBtn');
  const avatarInput = document.getElementById('avatarInput');
  const profileForm = document.querySelector('.profile-form');
  const formInputs = document.querySelectorAll('.profile-form input, .profile-form select');
  
  // Toggle edit mode
  if (editProfileBtn && saveProfileBtn) {
    editProfileBtn.addEventListener('click', function() {
      // Enable all form inputs
      formInputs.forEach(input => {
        input.disabled = false;
      });
      
      // Toggle buttons
      editProfileBtn.style.display = 'none';
      saveProfileBtn.style.display = 'block';
      
      // Add edit mode class to form
      if (profileForm) {
        profileForm.classList.add('edit-mode');
      }
    });
    
    saveProfileBtn.addEventListener('click', function() {
      // Here you would typically save the data to the server
      // For now, just disable the inputs again
      formInputs.forEach(input => {
        input.disabled = true;
      });
      
      // Toggle buttons
      editProfileBtn.style.display = 'block';
      saveProfileBtn.style.display = 'none';
      
      // Remove edit mode class
      if (profileForm) {
        profileForm.classList.remove('edit-mode');
      }
      
      // Show success message
      showAlert('Profile updated successfully!', 'success');
    });
  }
  
  // Handle avatar upload
  if (avatarUploadBtn && avatarInput) {
    avatarUploadBtn.addEventListener('click', function(e) {
      e.preventDefault();
      avatarInput.click();
    });
    
    avatarInput.addEventListener('change', function(e) {
      const file = e.target.files[0];
      if (file) {
        // Check file type
        if (!file.type.match('image.*')) {
          showAlert('Please select a valid image file', 'danger');
          return;
        }
        
        // Check file size (max 2MB)
        if (file.size > 2 * 1024 * 1024) {
          showAlert('Image size should be less than 2MB', 'danger');
          return;
        }
        
        // Preview image
        const reader = new FileReader();
        reader.onload = function(e) {
          const profileAvatar = document.getElementById('profileAvatar');
          if (profileAvatar) {
            profileAvatar.src = e.target.result;
            
            // Here you would typically upload the image to the server
            // For now, just show a success message
            showAlert('Profile picture updated successfully!', 'success');
          }
        };
        reader.readAsDataURL(file);
      }
    });
  }
  
  // Handle notification preferences save
  const saveNotificationPrefsBtn = document.getElementById('saveNotificationPrefs');
  if (saveNotificationPrefsBtn) {
    saveNotificationPrefsBtn.addEventListener('click', function() {
      // Here you would typically save the preferences to the server
      // For now, just show a success message
      showAlert('Notification preferences saved!', 'success');
    });
  }
  
  // Handle two-factor authentication toggle
  const twoFactorSwitch = document.getElementById('twoFactorSwitch');
  if (twoFactorSwitch) {
    twoFactorSwitch.addEventListener('change', function() {
      const isEnabled = this.checked;
      // Here you would typically update the 2FA status on the server
      const status = isEnabled ? 'enabled' : 'disabled';
      showAlert(`Two-factor authentication ${status}`, 'info');
    });
  }
  
  // Helper function to show alerts
  function showAlert(message, type = 'info') {
    // Remove any existing alerts
    const existingAlert = document.querySelector('.alert');
    if (existingAlert) {
      existingAlert.remove();
    }
    
    // Create alert element
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
    alertDiv.role = 'alert';
    alertDiv.innerHTML = `
      ${message}
      <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;
    
    // Add alert to the page
    const main = document.querySelector('main');
    if (main) {
      main.insertBefore(alertDiv, main.firstChild);
      
      // Auto-dismiss after 5 seconds
      setTimeout(() => {
        const alert = bootstrap.Alert.getOrCreateInstance(alertDiv);
        if (alert) {
          alert.close();
        }
      }, 5000);
    }
  }
  
  // Load user data from the server
  function loadUserData() {
    // In a real app, you would fetch this from your API
    // fetch('/api/citizen/profile')
    //   .then(response => response.json())
    //   .then(data => updateUI(data))
    //   .catch(error => console.error('Error loading profile data:', error));
    
    // For now, we'll use the data that's already in the HTML
  }
  
  // Update UI with user data
  function updateUI(userData) {
    // This function would update the UI with data from the server
    // Example:
    // if (userData.name) {
    //   document.getElementById('profileName').textContent = userData.name;
    // }
    // ... and so on for other fields
  }
  
  // Initialize the page
  loadUserData();
});
