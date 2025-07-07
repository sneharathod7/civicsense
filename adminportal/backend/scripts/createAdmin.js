const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Admin = require('../models/Admin');

require('dotenv').config({ path: __dirname + '/../.env' });

async function createAdmin() {
  await mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
  const email = 'pwd-admin@civic.in'; // change as needed
  const password = 'yourpassword'; // change as needed
  const hashedPassword = await bcrypt.hash(password, 10);
  await Admin.create({ email, password: hashedPassword });
  console.log('Admin created');
  process.exit();
}

createAdmin(); 