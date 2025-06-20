const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');
const path = require('path');

async function predictDepartment(imageFilename, issueType, location) {
    try {
        // If no image is provided, use rule-based prediction
        if (!imageFilename) {
            const issueTypeToDepartment = {
                'pothole': 'PWD',
                'garbage': 'Municipality',
                'streetlight': 'Electricity Board',
                'water': 'Water Board',
                'other': 'Other'
            };
            return issueTypeToDepartment[issueType] || 'Other';
        }

        // Read the file from disk
        const imagePath = path.join(__dirname, '../../uploads', imageFilename);
        const fileStream = fs.createReadStream(imagePath);

        const formData = new FormData();
        formData.append('photo', fileStream); // <-- must be 'photo' to match FastAPI
        formData.append('issue_type', issueType);
        formData.append('latitude', location.latitude);
        formData.append('longitude', location.longitude);

        const response = await axios.post('http://localhost:8000/predict', formData, {
            headers: formData.getHeaders()
        });

        return response.data.department;
    } catch (error) {
        console.error('Error predicting department:', error);
        const issueTypeToDepartment = {
            'pothole': 'PWD',
            'garbage': 'Municipality',
            'streetlight': 'Electricity Board',
            'water': 'Water Board',
            'other': 'Other'
        };
        return issueTypeToDepartment[issueType] || 'Other';
    }
}

module.exports = { predictDepartment };