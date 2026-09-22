# HourStay HMS - Receptionist Windows Desktop App (Electron)

This directory contains the dedicated **Receptionist Windows Desktop Application** for the HourStay Hotel Management System, built with **Electron** and **JavaScript**.

---

## 🏛️ Architecture & Highlights

- **Reuses Existing Frontend & Backend**: No duplicated React codebase. The desktop application loads the existing `frontend/` React application and connects to the existing `backend/` server.
- **Full Capabilities**:
  - Full JWT Authentication & Role-Based Permissions (Receptionist workspace).
  - Real-time live synchronization using **Socket.io** (`http://localhost:5000`).
  - Seamless access to MongoDB data via existing backend REST endpoints.
  - Check-in, Check-out, Room Assignment grid, Walk-in Bookings, Folio & Billing, Guest Search, and Payments.
- **Native Desktop Enhancements**:
  - Custom Receptionist Application Menu with keyboard shortcuts.
  - Native Windows Printing (`Ctrl+P`) for Folios, Invoices, and Guest Receipts.
  - Native Windows Desktop Notifications.
  - Intelligent auto-connect & reconnect screen when dev server is spinning up.
  - Single instance lock (prevents duplicate receptionist windows).
  - Secure Electron architecture (`contextIsolation: true`, `nodeIntegration: false`, safe IPC bridge).

---

## 🚀 Getting Started in Development

### 1. Start the Backend & Frontend Servers
In separate terminals from the project root:

```bash
# Terminal 1: Backend Server (Port 5000)
cd backend
npm start

# Terminal 2: Frontend Server (Port 5173)
cd frontend
npm run dev
```

### 2. Install Desktop Dependencies
```bash
cd desktop
npm install
```

### 3. Run the Receptionist Desktop App
```bash
cd desktop
npm start
```

*(You can also run `npm run dev`)*

---

## ⌨️ Receptionist Keyboard Shortcuts

| Shortcut | Action |
| :--- | :--- |
| **Ctrl + 1** | Reception Dashboard |
| **Ctrl + 2** | Check-In Desk |
| **Ctrl + 3** | Check-Out Desk |
| **Ctrl + 4** | Room Assignment & Grid |
| **Ctrl + 5** | New Walk-In Booking |
| **Ctrl + 6** | Guest Folio & Invoices |
| **Ctrl + 7** | Guest Directory & Search |
| **Ctrl + 8** | Payments & Billing Log |
| **Ctrl + 9** | Notifications |
| **Ctrl + P** | Print Folio / Receipt |
| **Ctrl + R / F5** | Refresh Reception Desk |
| **F11** | Toggle Fullscreen |
| **Ctrl + Shift + I** | Developer Tools |

---

## 📁 Directory Structure

```text
desktop/
├── package.json        # Desktop app configuration and scripts
├── main.js             # Electron main process (BrowserWindow, IPC, server loader)
├── preload.js          # Secure context bridge (`window.electronAPI`)
├── menu.js             # Receptionist application menu & shortcuts
└── README.md           # Documentation
```
