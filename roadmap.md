# CivicVerse MVP Development Roadmap

## Project Overview

- **Project Name:** Civicsense
- **Type:** Civic Engagement Platform
- **Target:** Functional prototype demonstrating core features

## MVP Scope & Features

### Core Features (Must-Have)

#### Issue Reporting System
- Photo upload functionality
- Basic text input (1-line description)
- Location auto-detection
- AI-generated formal complaint text
- Issue categorization (basic)

#### Issue Tracking
- Simple map view showing reported issues
- SLA countdown timer
- Issue status tracking (New, In Progress, Resolved)
- Basic escalation alerts

#### Public Dashboard
- Map view of all public issues
- Filter by category/status
- Issue details view

#### Basic Admin Panel
- View all reported issues
- Update issue status
- Basic response functionality

### Optional Features (Nice-to-Have)
- Anonymous reporting toggle
- Basic user authentication
- Simple notifications
- Issue verification by other users

## Technical Architecture

### Frontend
- **Framework:** React.js (Web) + React Native (Mobile)
- **Key Libraries:**
  - `react-router-dom` - Navigation
  - `react-leaflet` - Map integration
  - `axios` - API calls
  - `react-hook-form` - Form handling
  - `tailwindcss` - Styling
  - `react-camera-pro` - Camera integration

### Backend
- **Framework:** Node.js with Express.js
- **Database:** MongoDB (with Mongoose ODM)
- **Key Libraries:**
  - `express` - Web framework
  - `mongoose` - MongoDB ODM
  - `multer` - File upload handling
  - `cors` - Cross-origin resource sharing
  - `dotenv` - Environment variables
  - `bcryptjs` - Password hashing (if auth implemented)
  - `jsonwebtoken` - JWT tokens (if auth implemented)

### AI Integration
- **Service:** OpenAI GPT-3.5-turbo API
- **Purpose:** Generate formal complaint text from user input
- **Backup:** Hugging Face Transformers (if budget constraints)

### External Services
- **Map Service:** OpenStreetMap with Leaflet (free)
- **Geocoding:** OpenCage Geocoding API (free tier)
- **Image Storage:** Cloudinary (free tier) or local storage for MVP

## Database Schema

### Issues Collection
```javascript
{
  _id: ObjectId,
  title: String,
  userDescription: String,      // Original user input
  aiGeneratedText: String,      // AI-generated formal complaint
  category: String,             // e.g., "roads", "utilities", "safety"
  status: String,               // "new", "in_progress", "resolved"
  priority: String,             // "low", "medium", "high"
  location: {
    coordinates: [Number, Number], // [longitude, latitude]
    address: String
  },
  images: [String],             // Image URLs
  isAnonymous: Boolean,
  userId: ObjectId,             // Optional if anonymous
  createdAt: Date,
  updatedAt: Date,
  resolvedAt: Date,
  slaDeadline: Date,
  responses: [{
    message: String,
    timestamp: Date,
    adminId: ObjectId
  }]
}
```

### Users Collection (Optional for MVP)
```javascript
{
  _id: ObjectId,
  email: String,
  password: String,             // Hashed
  name: String,
  role: String,                 // "citizen", "admin"
  createdAt: Date
}
```

## API Endpoints

### Public Endpoints
- `GET /api/issues` - Get all public issues (with filters)
- `GET /api/issues/:id` - Get specific issue details
- `POST /api/issues` - Create new issue
- `POST /api/issues/:id/verify` - Verify issue (upvote)

### Admin Endpoints
- `GET /api/admin/issues` - Get all issues (including private)
- `PUT /api/admin/issues/:id` - Update issue status
- `POST /api/admin/issues/:id/respond` - Add admin response

### AI Endpoints
- `POST /api/ai/generate-complaint` - Generate formal complaint text

## File Structure

```
civicverse/
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   │   ├── IssueForm.jsx
│   │   │   ├── IssueMap.jsx
│   │   │   ├── IssueCard.jsx
│   │   │   └── AdminPanel.jsx
│   │   ├── pages/
│   │   │   ├── Home.jsx
│   │   │   ├── ReportIssue.jsx
│   │   │   ├── ViewIssues.jsx
│   │   │   └── Admin.jsx
│   │   ├── services/
│   │   │   └── api.js
│   │   ├── utils/
│   │   └── App.jsx
│   ├── package.json
│   └── tailwind.config.js
├── backend/
│   ├── controllers/
│   │   ├── issueController.js
│   │   ├── adminController.js
│   │   └── aiController.js
│   ├── models/
│   │   ├── Issue.js
│   │   └── User.js
│   ├── routes/
│   │   ├── issues.js
│   │   ├── admin.js
│   │   └── ai.js
│   ├── middleware/
│   │   └── auth.js
│   ├── utils/
│   │   └── aiService.js
│   ├── server.js
│   └── package.json
└── README.md
```

## Development Phases

### Phase 1: Backend Setup (Day 1 - Morning)
**Duration:** 3-4 hours

**Tasks:**
- Initialize Node.js project
- Set up Express server
- Configure MongoDB connection
- Create Issue model and basic CRUD operations
- Set up OpenAI API integration
- Test API endpoints with Postman

**Deliverables:**
- Working backend API
- Database connection established
- AI complaint generation working

### Phase 2: Frontend Core (Day 1 - Afternoon)
**Duration:** 4-5 hours

**Tasks:**
- Initialize React project
- Set up routing and basic layout
- Create issue reporting form
- Implement camera/photo upload
- Connect to backend API
- Basic styling with Tailwind

**Deliverables:**
- Functional issue reporting form
- Photo upload working
- AI complaint generation integrated

### Phase 3: Map Integration (Day 2 - Morning)
**Duration:** 3-4 hours

**Tasks:**
- Integrate Leaflet map
- Display issues on map
- Add location detection
- Implement map filters
- Create issue detail popup

**Deliverables:**
- Interactive map showing issues
- Location-based reporting
- Issue filtering capabilities

### Phase 4: Admin Panel & Polish (Day 2 - Afternoon)
**Duration:** 4-5 hours

**Tasks:**
- Create admin dashboard
- Implement status updates
- Add SLA countdown timers
- Create escalation alerts
- Final testing and bug fixes
- Prepare demo presentation

**Deliverables:**
- Working admin panel
- SLA tracking system
- Polished UI/UX
- Demo-ready application

## Environment Setup

### Required Environment Variables

```bash
# Backend (.env)
PORT=5000
MONGODB_URI=mongodb://localhost:27017/civicverse
OPENAI_API_KEY=your_openai_api_key
CLOUDINARY_CLOUD_NAME=your_cloud_name # (optional)
CLOUDINARY_API_KEY=your_api_key # (optional)
CLOUDINARY_API_SECRET=your_api_secret # (optional)
OPENCAGE_API_KEY=your_opencage_api_key # (optional)
```

### Installation Commands

```bash
# Backend setup
cd backend
npm init -y
npm install express mongoose cors dotenv multer axios
npm install -D nodemon

# Frontend setup
cd frontend
npx create-react-app .
npm install react-router-dom axios react-leaflet leaflet react-hook-form
npm install -D tailwindcss
```

## AI Integration Details

### OpenAI Prompt Template

```javascript
const generateComplaintPrompt = (userInput, category, location) => {
  return `
    Convert this citizen complaint into a formal, professional complaint letter:
    
    User Description: "${userInput}"
    Category: ${category}
    Location: ${location}
    
    Generate a formal complaint that includes:
    1. Professional greeting
    2. Clear description of the issue
    3. Location details
    4. Request for action
    5. Professional closing
    
    Keep it concise but comprehensive.
  `;
};
```

## Testing Strategy

### Unit Tests (Optional for MVP)
- API endpoint testing
- AI service testing
- Component testing

### Manual Testing Checklist
- [ ] Issue can be reported with photo
- [ ] AI generates proper complaint text
- [ ] Issues appear on map correctly
- [ ] Admin can update issue status
- [ ] SLA timers work correctly
- [ ] Responsive design works on mobile

## Deployment (Post-MVP)

### Quick Deployment Options
- **Frontend:** Netlify or Vercel
- **Backend:** Heroku or Railway
- **Database:** MongoDB Atlas (free tier)

### Environment Setup for Deployment
- Set up production environment variables
- Configure CORS for production domains
- Set up error logging and monitoring

## Success Metrics for MVP Demo

- **Functional Demo:** All core features working end-to-end
- **AI Integration:** Complaint generation working smoothly
- **Visual Appeal:** Clean, professional UI
- **Performance:** Fast loading and responsive
- **Real Data:** At least 5-10 sample issues for demo

## Risk Mitigation

### Technical Risks
- **AI API Limits:** Have fallback static templates
- **Map Service Issues:** Use simple coordinate display as backup
- **Database Connection:** Include local JSON file backup

### Time Management
- **Priority Features:** Focus on core reporting and viewing
- **Cut Scope:** Remove nice-to-have features if running behind
- **Parallel Development:** Split frontend/backend work between team members

---

*This roadmap serves as a comprehensive guide for developing the CivicVerse MVP within a 2-3 day hackathon timeline. Focus on core functionality first, then add enhancements as time permits.*