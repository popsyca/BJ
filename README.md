# 👑 Royal Blackjack

Royal Blackjack is a premium, real-time multiplayer casino game experience. Play blackjack against a dealer bot with live chip balance tracking, smooth animations, and premium sound effects.

🚀 **Play Live Here:** [https://blackjack-8fs0.onrender.com](https://blackjack-8fs0.onrender.com)

---

## ✨ Features & Architecture

### 🛡️ Security Hardening & Refactoring
This project has undergone comprehensive refactoring to enforce security best practices:
- **HttpOnly Cookies for JWT**: Migrated session storage from vulnerable `localStorage` to XSS-protected, HTTP-Only, SameSite cookies.
- **Brute Force Protection**: Integrated `express-rate-limit` middleware on `/login` and `/register` endpoints, allowing a maximum of 5 requests per 15 minutes per IP.
- **Cryptographically Secure IDs**: Replaced insecure `Math.random()` ID generation with Node.js's built-in `crypto.randomUUID()`.
- **Database Persistence**: Migrated local file-based database (`db.json`) to MongoDB using Mongoose schemas and models, resolving race conditions.
- **Strict Environment Variables**: Removed all hardcoded fallbacks for `JWT_SECRET`, forcing the application to read configuration values strictly from environment configurations.

### 🎮 Gameplay Experience
- Real-time communication via **WebSockets (Socket.io)**.
- Premium web audio synth for dealer chips and card flips sound effects.
- Dynamic responsive casino felt table design optimized for all desktop and mobile viewports.
- Automatic session restoration on reload.

---

## 🛠️ Tech Stack
- **Frontend**: React, TypeScript, Vite, Tailwind CSS, Lucide Icons, Socket.io Client.
- **Backend**: Node.js, Express, TypeScript, Mongoose, Socket.io, JWT, bcryptjs, Cookie Parser, Express Rate Limit.
- **Database**: MongoDB (Atlas).

---

## 💻 Local Development Setup

### 1. Prerequisites
- Node.js (v18+)
- MongoDB running locally or a MongoDB Atlas connection string.

### 2. Configure Environment Variables
Create a `.env` file in the `backend` folder:
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/blackjack # or your MongoDB Atlas URI
JWT_SECRET=your_jwt_secret_key_here
```

### 3. Start Backend Server
```bash
cd backend
npm install
npm run dev
```

### 4. Start Frontend Client
```bash
cd frontend
npm install
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 🚀 Deployment (Render)
This project is configured for seamless deployment on Render:
- **Backend Web Service**: Uses `npm run build` as build command and `npm start` as start command. Environment variables (`MONGODB_URI`, `JWT_SECRET`, `FRONTEND_URL`) should be configured in the Render Dashboard.
- **Frontend Static Site**: Publishes the compiled `dist/` directory. Requires setting `VITE_API_URL` pointing to the deployed backend URL.

---

*Made with 👑 by İrem TUNÇ and İncilay KURTULUŞ, 2026.*
