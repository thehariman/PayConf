import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { firebaseConfig } from "./firebase_config.js";


// --- Initialization ---
if (firebaseConfig.apiKey === "YOUR_API_KEY") {
    console.warn("⚠️ Firebase Authentication is NOT yet configured. Please add your config to auth_check.js");
} else {
    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);

    // Check authentication state
    onAuthStateChanged(auth, (user) => {
        if (!user) {
            window.location.href = 'login.html';
        } else {
            const avatarEl = document.querySelector('.avatar');
            if (avatarEl && user.photoURL) {
                avatarEl.innerHTML = `<img src="${user.photoURL}" alt="User" style="width: 100%; border-radius: 50%;">`;
                avatarEl.title = `Logged in as ${user.displayName}`;
            }
            // Start tracking inactivity only if user is logged in
            resetTimer();
        }
    });

    // --- Inactivity Tracker (5 Minutes) ---
    let inactivityTimer;
    const INACTIVITY_LIMIT = 5 * 60 * 1000; // 5 minutes

    function resetTimer() {
        clearTimeout(inactivityTimer);
        inactivityTimer = setTimeout(autoLogout, INACTIVITY_LIMIT);
    }

    async function autoLogout() {
        if (!auth.currentUser) return; // Already logged out
        try {
            await signOut(auth);
            window.location.href = 'login.html';
        } catch (error) {
            console.error("Auto-logout failed:", error);
        }
    }

    // Register events to reset the timer
    const activityEvents = ['mousemove', 'keydown', 'scroll', 'click', 'touchstart'];
    activityEvents.forEach(event => {
        window.addEventListener(event, resetTimer, true);
    });

    // Logout functionality via Listener
    document.addEventListener('click', async (e) => {
        const logoutBtn = e.target.closest('#logoutBtn');
        if (logoutBtn) {
            e.preventDefault();
            try {
                await signOut(auth);
                window.location.href = 'login.html';
            } catch (error) {
                console.error("Logout failed:", error);
                alert("Logout failed. See console for details.");
            }
        }
    });
}
