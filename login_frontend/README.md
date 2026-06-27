# Government Health Connect — Login React Frontend

A standalone, secure React micro-frontend portal designed specifically to authenticate administrative staff and securely redirect them back to the main portal.

---

## 🎨 Design & Features

* **Framework**: React + Vite + TypeScript
* **Styling**: TailwindCSS (matching the main GHC theme, using Teal palette)
* **National Branding**: Distinct saffron-white-green tricolor top accent border.
* **Branded Emblem**: Embedded centered, square-cropped government health emblem.
* **SSO Flow**:
  1. Requests auth verification from `http://localhost:3001/auth/login`.
  2. Receives a JWT token.
  3. Redirects the authenticated user back to the main frontend with the token query parameter: `http://localhost:5173/?token=JWT`.
* **UX Enhancements**:
  * Validation checking on inputs.
  * Active loading spinners on the submit trigger.
  * Shake alert animation on validation errors.
  * Complete keyboard accessibility support.

---

## 🚀 Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Run the Development Server
Starts the Vite dev server on port `4005` (hot-reloads instantly on saves):
```bash
npm run dev
```

---

## 🔒 SSO Port Mapping

* **Login Frontend**: Runs on `http://localhost:4005`
* **Main Frontend**: Runs on `http://localhost:5173`
* **Login Backend**: Runs on `http://localhost:3001`
* **Main Backend**: Runs on `http://localhost:3000`
