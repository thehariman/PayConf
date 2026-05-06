# Thiranex | Dedicated Payment Management Portal

Thiranex is a premium, cloud-powered web portal designed for secure payment verification and financial reporting. Built on Firebase, it offers real-time data synchronization and high-end security.

## ✨ Core Features

*   **Secure Admin Access**: Integrated Google Authentication for protected portal entry.
*   **Cloud Backend**: Powered by Firebase Firestore for real-time, serverless data management.
*   **Bulk Verification**: Streamlined "Approve/Refund" workflow for handling large transaction batches.
*   **Monthly Reporting**: Comprehensive financial summaries with Excel export capability.
*   **Mobile Ready**: Fully responsive design for managing payments on the go.

## 🚀 Quick Start (Cloud Setup)

1.  **Firebase Setup**: Follow the [Firebase Setup Guide](firebase_setup.md) to create your project and get your config.
2.  **Configuration**: Paste your Firebase Config into the following files:
    *   `login.html`
    *   `auth_check.js`
    *   `app.js`
    *   `reports.js`
3.  **Enable Security**: In `index.html` and `reports.html`, uncomment the `<script type="module" src="auth_check.js"></script>` line to enable the Google Login guard.
4.  **Open Portal**: Open `index.html` in any browser.

## 📂 Project Structure

*   `index.html`: Main dashboard and transaction verification center.
*   `reports.html`: Financial performance and reporting module.
*   `login.html`: Secure entry point with Google Auth.
*   `app.js`: Main application logic (Firebase).
*   `reports.js`: Reporting logic (Firebase).
*   `auth_check.js`: Security layer for session monitoring.
*   `style.css`: Premium UI design system.

---
*Built with ❤️ for Thiranex Tech Solutions.*
