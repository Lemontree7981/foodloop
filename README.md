# 🍽️ FoodLoop

**Connect surplus food with those who need it.**

FoodLoop is a full-stack web application that bridges the gap between food donors (restaurants, caterers, individuals) and receivers (NGOs, shelters, individuals in need). Reduce food waste while making a positive impact in your community.

![License](https://img.shields.io/badge/license-MIT-green)
![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)
![React](https://img.shields.io/badge/react-18.x-blue)

## ✨ Features

- **🔐 Secure Authentication** - Email/password auth powered by Firebase
- **📦 Food Listings** - Post surplus food with details like quantity, category, and expiry time
- **🏷️ Food Categories** - Vegetarian, Non-Vegetarian, Vegan, Desserts, Beverages, Mixed
- **⏰ Expiry Tracking** - Real-time countdown showing food freshness
- **📱 Responsive Design** - Beautiful UI that works on all devices
- **📊 Impact Dashboard** - Track meals saved and environmental impact
- **🤝 Claim System** - NGOs and volunteers can claim available food

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 18, CSS3, Lucide Icons |
| **Backend** | Node.js, Express.js |
| **Database** | PostgreSQL |
| **Authentication** | Firebase Auth |
| **API** | RESTful JSON API |

## 📋 Prerequisites

- Node.js >= 18.0.0
- PostgreSQL >= 14
- Firebase project (for authentication)

## 🚀 Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/YOUR_USERNAME/foodloop.git
cd foodloop
```

### 2. Install dependencies

```bash
# Install backend dependencies
npm install

# Install frontend dependencies
cd foodloop-frontend
npm install
cd ..
```

### 3. Configure environment variables

```bash
# Copy the example environment file
cp .env.example .env

# Edit .env with your configuration
nano .env
```

Required environment variables:
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - Secret key for JWT tokens (generate a secure random string)
- `PORT` - Server port (default: 5000)
- `FRONTEND_URL` - Frontend URL for CORS (default: http://localhost:3000)

### 4. Set up Firebase

1. Create a project at [Firebase Console](https://console.firebase.google.com/)
2. Enable Email/Password authentication
3. Download your service account key and save it as `backend/serviceAccountKey.json`
4. Update `foodloop-frontend/src/firebase.js` with your Firebase config

### 5. Set up the database

```bash
# Create the database and tables
npm run setup
```

### 6. Start the application

```bash
# Terminal 1: Start the backend
npm run dev

# Terminal 2: Start the frontend
cd foodloop-frontend
npm start
```

The app will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000

## 📁 Project Structure

```
foodloop/
├── backend/
│   ├── config/          # Database configuration
│   ├── middleware/      # Auth middleware
│   ├── routes/          # API routes (auth, listings, claims)
│   └── server.js        # Express server entry point
├── database/
│   ├── schema.sql       # Database schema
│   ├── seed.sql         # Sample data
│   └── setup.js         # Database setup script
├── foodloop-frontend/
│   ├── public/          # Static assets
│   └── src/
│       ├── App.js       # Main React component
│       ├── App.css      # Styles
│       └── firebase.js  # Firebase configuration
├── .env.example         # Environment variables template
├── package.json         # Backend dependencies
└── README.md            # This file
```

## 🔌 API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/sync` | Sync Firebase user with database |

### Listings
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/listings` | Get all available food listings |
| POST | `/api/listings` | Create a new food listing |
| GET | `/api/listings/:id` | Get a specific listing |

### Claims
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/claims` | Claim a food listing |
| GET | `/api/claims/my-claims` | Get user's claims |

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Icons by [Lucide](https://lucide.dev/)
- Authentication by [Firebase](https://firebase.google.com/)

---

**Made with ❤️ to reduce food waste**
