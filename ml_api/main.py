from fastapi import FastAPI, File, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image
import io
import json
from typing import Optional

app = FastAPI()

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Department mapping
DEPARTMENT_MAPPING = {
    "road": "PWD",
    "park": "Municipality",
    "street": "Municipality",
    "water": "Water Board",
    "electricity": "Electricity Board",
    "other": "Other"
}

def get_location_context(latitude: float, longitude: float) -> str:
    """Get location context using reverse geocoding."""
    # In a real application, you would use a geocoding service
    # For now, return a dummy context
    return "road"

@app.post("/predict")
async def predict_department(
    photo: UploadFile = File(...),
    issue_type: str = Form(...),
    latitude: float = Form(...),
    longitude: float = Form(...)
):
    """Predict the department responsible for handling the issue."""
    try:
        # Get location context
        location_context = get_location_context(latitude, longitude)
        
        # Use rules-based approach
        department = DEPARTMENT_MAPPING.get(location_context, "Other")
        
        return {
            "department": department,
            "confidence": 0.8,  # Dummy confidence score
            "location_context": location_context
        }
        
    except Exception as e:
        return {"error": str(e)}

@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 