# 🔥 Firebase Setup Guide (Zero-Knowledge)

This guide will help you set up **Firebase** as your cloud backend for Thiranex. Firebase allows you to have a secure, online database and Google Login without running any local servers.

---

## 🟢 Step 1: Create a Firebase Project
1.  Go to the [Firebase Console](https://console.firebase.google.com/).
2.  Click **"Add project"**.
3.  Name it `Thiranex-Portal`.
4.  Click **"Continue"** (Disable Google Analytics for now to keep it simple).
5.  Click **"Create project"**.

## 🟡 Step 2: Enable Google Login
1.  In the left sidebar, click **"Build"** -> **"Authentication"**.
2.  Click **"Get Started"**.
3.  Choose **"Google"** from the list of providers.
4.  Click **"Enable"** (toggle in the top right).
5.  Select your email in the **"Project support email"** box.
6.  Click **"Save"**.

## 🟠 Step 3: Set Up the Database (Firestore)
1.  In the sidebar, click **"Build"** -> **"Firestore Database"**.
2.  Click **"Create database"**.
3.  Select **"Start in test mode"** (this is easiest for setup).
4.  Click **"Next"** and then **"Enable"**.

## 🔴 Step 4: Get Your Credentials (The "Key")
1.  Click the **Project Overview** (house icon) in the top left.
2.  Click the **Web icon** (`</>`) in the center of the page.
3.  Give it a nickname (e.g., `Thiranex-App`).
4.  Click **"Register app"**.
5.  You will see a code block that looks like this:
    ```javascript
    const firebaseConfig = {
      apiKey: "AIza...",
      authDomain: "...",
      projectId: "...",
      storageBucket: "...",
      messagingSenderId: "...",
      appId: "..."
    };
    ```
6.  **COPY THIS BLOCK.** You will need it for the next step.

---

## 🔵 Step 5: Connect to the Portal
1.  Open **`firebase_config.js`** in your code editor.
2.  Find the `const firebaseConfig = { ... }` block.
3.  **Replace the placeholders** (like `"YOUR_API_KEY"`) with the actual values you copied in Step 4.
4.  **Save the file.**

---
*You are now set up! Your portal is protected by Google security and connected to the cloud.*

