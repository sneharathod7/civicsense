const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Admin = require('../models/Admin');
require('dotenv').config({ path: __dirname + '/../.env' });

const admins = [
  { email: 'pwd-admin@civic.in', password: 'civic123' },
  { email: 'water-admin@civic.in', password: 'civic123' },
  { email: 'electric-admin@civic.in', password: 'civic123' },
  { email: 'env-admin@civic.in', password: 'civic123' },
  { email: 'sanitation-admin@civic.in', password: 'civic123' },
  { email: 'infra-admin@civic.in', password: 'civic123' }
];

async function seedAdmins() {
  await mongoose.connect(process.env.MONGO_URI);
  for (const admin of admins) {
    const hashedPassword = await bcrypt.hash(admin.password, 10);
    await Admin.findOneAndUpdate(
      { email: admin.email },
      { password: hashedPassword },
      { upsert: true }
    );
    console.log(`Seeded: ${admin.email}`);
  }
  process.exit();
}

seedAdmins(); 