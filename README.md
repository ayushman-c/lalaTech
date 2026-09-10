# TaskFlow - Client Chaos MVP

A centralized task and workflow management system for Lala Tech LLC.

## Quick Start

### Prerequisites
- Node.js (v18 or higher)
- MongoDB Atlas account (free) OR local MongoDB

### 1. Install Dependencies

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### 2. Setup MongoDB Atlas (Recommended)

1. Go to [mongodb.com/atlas](https://www.mongodb.com/atlas) and create free account
2. Create a free cluster (M0 Sandbox)
3. Click "Connect" → "Connect your application"
4. Copy the connection string
5. Replace `<password>` with your database user password

### 3. Configure Environment

```bash
# Backend
cd backend
cp .env.example .env
```

Edit `.env` file:
```env
MONGODB_URI=mongodb+srv://your-username:your-password@cluster0.xxxxx.mongodb.net/taskflow?retryWrites=true&w=majority
JWT_SECRET=your-super-secret-jwt-key
FRONTEND_URL=http://localhost:5173
PORT=5000
```

### 3. Seed Demo Data

```bash
cd backend
npm run seed
```

### 4. Start Development Servers

```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm run dev
```

### 5. Open Application

- Frontend: http://localhost:5173
- Backend API: http://localhost:5000

## Demo Accounts

| Role    | Email                    | Password     |
|---------|--------------------------|--------------|
| Admin   | admin@lalatech.com       | admin123     |
| Manager | manager@lalatech.com     | manager123   |
| Employee| sarah@lalatech.com       | employee123  |
| Employee| james@lalatech.com       | employee123  |
| Employee| maria@lalatech.com       | employee123  |

## Features

### Core (MVP)
- ✅ User authentication (JWT)
- ✅ Role-based access (Admin/Manager/Employee)
- ✅ Task CRUD operations
- ✅ Task assignment
- ✅ Status tracking (Pending → In Progress → Complete)
- ✅ Dashboard with real-time overview
- ✅ In-app notifications
- ✅ Task comments
- ✅ Activity logging
- ✅ Search & filters
- ✅ Realistic demo data

### Deferred
- ❌ Google Calendar sync
- ❌ Email notifications
- ❌ Mobile app

## Tech Stack

- **Frontend:** React 19 + Vite + Tailwind CSS
- **Backend:** Node.js + Express
- **Database:** MongoDB
- **Auth:** JWT + bcrypt

## API Endpoints

### Auth
- `POST /api/auth/register` - Register user
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user

### Tasks
- `GET /api/tasks` - List tasks (with filters)
- `POST /api/tasks` - Create task
- `GET /api/tasks/:id` - Get task
- `PUT /api/tasks/:id` - Update task
- `DELETE /api/tasks/:id` - Delete task
- `PUT /api/tasks/:id/assign` - Assign task
- `PUT /api/tasks/:id/status` - Change status
- `POST /api/tasks/:id/comments` - Add comment

### Users
- `GET /api/users` - List users (admin/manager)

### Notifications
- `GET /api/notifications` - List notifications
- `PUT /api/notifications/:id/read` - Mark read
- `PUT /api/notifications/read-all` - Mark all read

### Dashboard
- `GET /api/dashboard/stats` - Get statistics
- `GET /api/dashboard/activity` - Get activity feed

## Project Structure

```
tiu/
├── backend/
│   ├── config/
│   │   └── db.js
│   ├── middleware/
│   │   └── auth.js
│   ├── models/
│   │   ├── User.js
│   │   ├── Task.js
│   │   ├── Comment.js
│   │   ├── ActivityLog.js
│   │   └── Notification.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── users.js
│   │   ├── tasks.js
│   │   ├── notifications.js
│   │   └── dashboard.js
│   ├── server.js
│   ├── seed.js
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── layout/
│   │   │   │   ├── Sidebar.jsx
│   │   │   │   ├── Header.jsx
│   │   │   │   └── DashboardLayout.jsx
│   │   │   ├── ui/
│   │   │   │   ├── Button.jsx
│   │   │   │   ├── Input.jsx
│   │   │   │   └── Select.jsx
│   │   │   └── ProtectedRoute.jsx
│   │   ├── context/
│   │   │   └── AuthContext.jsx
│   │   ├── pages/
│   │   │   ├── Login.jsx
│   │   │   ├── Register.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Tasks.jsx
│   │   │   ├── TaskDetail.jsx
│   │   │   ├── TaskForm.jsx
│   │   │   ├── Notifications.jsx
│   │   │   └── Users.jsx
│   │   ├── services/
│   │   │   └── api.js
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   └── package.json
└── README.md
```

## Deployment

### Backend (Render)
1. Push to GitHub
2. Create new Web Service on Render
3. Connect repository
4. Set build command: `npm install`
5. Set start command: `node server.js`
6. Add environment variables

### Frontend (Vercel)
1. Push to GitHub
2. Import project on Vercel
3. Set build command: `npm run build`
4. Set output directory: `dist`
5. Add environment variable: `VITE_API_URL`

## License

MIT
