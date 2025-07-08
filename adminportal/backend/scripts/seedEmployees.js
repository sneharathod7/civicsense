const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Employee = require('../models/Employee');

// Load environment variables
dotenv.config();

// Departments from your admin mapping
const departments = [
  "Public Works Department (PWD)",
  "Water Supply & Sewerage Board",
  "Electricity Board",
  "Pollution Control Board / Environment Department",
  "Municipal Corporation (Sanitation Wing)",
  "Urban Development Authority / PWD"
];

// Sample employee data
const sampleEmployees = [
  { name: 'John Doe', email: 'john.pwd@example.com', phone: '9876543210' },
  { name: 'Jane Smith', email: 'jane.pwd@example.com', phone: '9876543211' },
  { name: 'Robert Johnson', email: 'robert.water@example.com', phone: '9876543212' },
  { name: 'Emily Davis', email: 'emily.electric@example.com', phone: '9876543213' },
  { name: 'Michael Brown', email: 'michael.env@example.com', phone: '9876543214' },
  { name: 'Sarah Wilson', email: 'sarah.sanitation@example.com', phone: '9876543215' },
  { name: 'David Taylor', email: 'david.uda@example.com', phone: '9876543216' }
];

// Map employees to departments
const employees = sampleEmployees.map((emp, index) => {
  const deptIndex = Math.min(Math.floor(index / 2), departments.length - 1);
  return {
    employeeId: `EMP${1000 + index}`,
    name: emp.name,
    email: emp.email,
    phone: emp.phone,
    department: departments[deptIndex],
    status: 'not assigned',
    gender: ['male', 'female', 'other'][index % 3]
  };
});

async function seedDatabase() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('MongoDB connected');

    // Clear existing employees (optional, remove if you want to keep existing data)
    await Employee.deleteMany({});
    console.log('Cleared existing employees');

    // Insert new employees
    const created = await Employee.insertMany(employees);
    console.log(`Successfully seeded ${created.length} employees`);

    // Display the created employees
    const allEmployees = await Employee.find({}).sort('department');
    console.log('\nCurrent employees in database:');
    allEmployees.forEach(emp => {
      console.log(`${emp.employeeId}: ${emp.name} (${emp.department}) - ${emp.status}`);
    });

    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
}

seedDatabase();
