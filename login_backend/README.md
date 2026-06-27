# Government Health Connect — Login Backend Microservice

An independent, lightweight NestJS authentication microservice designed to handle user validation, hash verification, and JWT generation for the Government Health Connect (GHC) portal.

---

## 🛠️ Tech Stack & Features

* **Framework**: NestJS (v11)
* **Database**: MongoDB (via Mongoose)
* **Security & Auth**:
  * `bcrypt` constant-time password verification.
  * Passport JWT strategy and verification guards.
  * Strict input type validation to prevent NoSQL injection.
  * Case-sensitive database user lookup.
* **Auto-Reload**: Configured with `nodemon` to watch and auto-restart on `.ts` or `.env` modifications.

---

## ⚙️ Environment Variables

Create a `.env` file in the root of the `login_backend` directory:

```env
PORT=3001
MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/healthcare
JWT_SECRET=ghc-ai-secret-key-4005
JWT_EXPIRES_IN=5m
```

---

## 🚀 Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Run the Development Server
Starts the application on port `3001` with hot-reloading:
```bash
npm run start:dev
```

---

## 📡 API Endpoints

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| **GET** | `/` | Service status welcome check | No |
| **POST** | `/auth/login` | Authenticate username/password & return JWT | No |
