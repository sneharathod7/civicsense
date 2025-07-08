// Mock authentication service for development
const MOCK_USERS = [
  {
    id: 1,
    email: 'pwd@civicsense.com',
    password: 'password123',
    department: 'Public Works Department',
    role: 'admin'
  },
  {
    id: 2,
    email: 'electricity@civicsense.com',
    password: 'password123',
    department: 'Electricity Department',
    role: 'admin'
  }
];

// Simulate API call delay
const simulateApiCall = (data) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(data);
    }, 800); // 800ms delay to simulate network
  });
};

export const mockLogin = async (email, password) => {
  const user = MOCK_USERS.find(u => u.email === email && u.password === password);
  
  if (!user) {
    return simulateApiCall({
      success: false,
      message: 'Invalid email or password'
    });
  }

  // Remove password before returning
  const { password: _, ...userData } = user;
  
  return simulateApiCall({
    success: true,
    token: `mock-jwt-token-${user.id}`,
    ...userData
  });
};

const adminEmailToDepartment = {
  "pwd-admin@civic.in": "Public Works Department (PWD)",
  "water-admin@civic.in": "Water Supply & Sewerage Board",
  "electric-admin@civic.in": "Electricity Board",
  "env-admin@civic.in": "Pollution Control Board / Environment Department",
  "sanitation-admin@civic.in": "Municipal Corporation (Sanitation Wing)",
  "infra-admin@civic.in": "Urban Development Authority / PWD"
};

function getDepartmentByEmail(email) {
  return adminEmailToDepartment[email] || null;
}

window.getDepartmentByEmail = getDepartmentByEmail;
