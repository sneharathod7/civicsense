# CivicSense+ - Citizen Complaint Management System

A modern application that helps citizens report and track civic issues in their surroundings.

## Features

- 📸 Photo + Location Capture
- 🤖 AI-powered Department Detection
- 📝 Auto-complaint Draft Generation
- 📱 Multi-channel Notifications (Email + WhatsApp)
- 🗺️ Interactive Map View
- ⭐ Community Upvoting
- 📊 Status Tracking
- 🔄 Auto-escalation System

## Tech Stack

### Backend
- Node.js + Express
- MySQL (via Sequelize)
- TensorFlow.js (for ML)
- Twilio (WhatsApp API)
- Nodemailer (Email)

### Frontend (Coming Soon)
- HTML, CSS, Bootstrap
- Mapbox/Google Maps SDK

## Setup Instructions

1. Clone the repository:
```bash
git clone https://github.com/yourusername/civicsense-plus.git
cd civicsense-plus
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory with the following variables:
```
# Server Configuration
PORT=5000
NODE_ENV=development

# MySQL Configuration
MYSQL_HOST=localhost
MYSQL_USER=your_mysql_user
MYSQL_PASSWORD=your_mysql_password
MYSQL_DATABASE=civicsense

# SMTP Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-specific-password
SMTP_FROM=CivicSense <your-email@gmail.com>

# Department Email Addresses
DEPARTMENT_EMAILS={
    "PWD": "pwd@example.com",
    "Municipality": "municipality@example.com",
    "Electricity Board": "electricity@example.com",
    "Water Board": "water@example.com",
    "Other": "other@example.com"
}

# Twilio Configuration
TWILIO_ACCOUNT_SID=your-account-sid
TWILIO_AUTH_TOKEN=your-auth-token
TWILIO_WHATSAPP_NUMBER=+14155238886

# Department WhatsApp Numbers
DEPARTMENT_WHATSAPP_NUMBERS={
    "PWD": "+1234567890",
    "Municipality": "+1234567891",
    "Electricity Board": "+1234567892",
    "Water Board": "+1234567893",
    "Other": "+1234567894"
}
```

4. Start MySQL and create the database:
```sql
CREATE DATABASE civicsense;
```

5. Start the ML API (in another terminal):
```bash
npm run ml-api
```

6. Run the development server:
```bash
npm run dev
```

## API Endpoints

### Complaints
- `POST /api/complaints` - Create a new complaint
- `GET /api/complaints` - Get all complaints
- `GET /api/complaints/nearby` - Get nearby complaints
- `GET /api/complaints/:id` - Get a specific complaint
- `PATCH /api/complaints/:id/status` - Update complaint status
- `POST /api/complaints/:id/upvote` - Upvote a complaint

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- TensorFlow.js for ML capabilities
- Twilio for WhatsApp integration
- MySQL for database
- Express.js for the backend framework 