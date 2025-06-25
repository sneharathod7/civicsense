# Scratchpad

## Overview
This project is a full-stack web application called **CivicSense** that allows citizens to report civic issues.

* **Backend (Node.js / Express)**  
  * Located in `backend/`  
  * REST API routes under `backend/routes/`  
  * Controllers implement business logic in `backend/controllers/`  
  * MySQL via Sequelize (`backend/config/db.js`)  
  * ML Predict & Geocoding proxied to Python service and external APIs.  
  * Utilities: email, WhatsApp, ML classifier.

* **ML API (Python / FastAPI)**  
  * Located in `ml_api/`  
  * Simple endpoint `/predict` returning department prediction.

* **Frontend**  
  * Static assets inside `public/` served by Express  
  * Pages: `index.html`, `login-signup.html`, `report.html`, etc.  
  * Client JS lives in `public/js/`.

## Current Task: Implement My Profile Page

### Requirements:
- Update profile page to match wireframe design
- Include sections:
  - Profile header with photo, name, rank, member since, location
  - Contact information with verification status
  - Personal details
  - Civic stats dashboard
  - Account settings
- Integrate with backend CitizenProfile model

### Implementation Plan:
1. [ ] Create/update profile.html with new layout
2. [ ] Add profile.css for styling
3. [ ] Create profile.js for dynamic content loading
4. [ ] Integrate with backend API endpoints
5. [ ] Implement photo upload functionality
6. [ ] Add edit/save functionality for profile fields

### Backend Endpoints Needed:
- GET /api/citizen/profile - Get full profile data
- PUT /api/citizen/profile - Update profile
- POST /api/citizen/profile/photo - Upload profile photo

### Files to Modify/Create:
- public/profile.html
- public/css/profile.css
- public/js/profile.js
- backend/routes/citizenProfile.js
- backend/controllers/citizenProfileController.js

## Tasks / TODO

[x] Plan profile page implementation
[ ] Implement frontend HTML/CSS
[ ] Implement frontend JavaScript
[ ] Implement backend endpoints
[ ] Test integration
[ ] Deploy changes
