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

## Tasks / TODO

[] Await user instructions.
