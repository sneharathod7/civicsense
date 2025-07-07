// Global Mock API - Simplified and Explicit
(function(global) {
    // Explicitly create mockApi object if it doesn't exist
    if (!global.mockApi) {
        global.mockApi = {};
    }

    // Simple complaints data
    var complaints = [
        { id: 'C1', title: 'Pothole', status: 'pending' },
        { id: 'C2', title: 'Streetlight', status: 'in-progress' }
    ];

    // Explicitly define getComplaints method
    global.mockApi.getComplaints = function() {
        console.log('MockAPI: getComplaints called');
        return new Promise(function(resolve) {
            resolve({ 
                data: complaints, 
                message: 'Complaints retrieved successfully' 
            });
        });
    };

    global.mockApi.getEmployees = function() {
        console.log('MockAPI: getEmployees called');
        return Promise.resolve({ 
            data: [
                { id: 'E1', name: 'John Doe', department: 'Public Works' }
            ], 
            message: 'Employees retrieved successfully' 
        });
    };

    // Log to confirm script execution
    console.log('MockAPI script loaded and exposed');
})(typeof window !== 'undefined' ? window : global);
