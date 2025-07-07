const mongoose = require('mongoose');
const Report = require('../models/Report');
require('dotenv').config({ path: __dirname + '/../.env' });

async function createReports() {
  await mongoose.connect(process.env.MONGO_URI);
  await Report.create([
    // PWD
    { department: "Public Works Department (PWD)", status: "Pending" },
    { department: "Public Works Department (PWD)", status: "In Progress" },
    { department: "Public Works Department (PWD)", status: "Resolved" },
    // Water
    { department: "Water Supply & Sewerage Board", status: "Pending" },
    { department: "Water Supply & Sewerage Board", status: "Resolved" },
    // Electricity
    { department: "Electricity Board", status: "Pending" },
    { department: "Electricity Board", status: "In Progress" },
    // Environment
    { department: "Pollution Control Board / Environment Department", status: "Pending" },
    // Sanitation
    { department: "Municipal Corporation (Sanitation Wing)", status: "Resolved" },
    // Infra
    { department: "Urban Development Authority / PWD", status: "In Progress" },
    { department: "Urban Development Authority / PWD", status: "Pending" }
  ]);
  console.log('Sample reports created');
  process.exit();
}
createReports(); 