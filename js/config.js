// js/config.js - Firebase Configuration (Modular SDK v9+)

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyCSeWPRUtxdmYUSqfE9qx44Xf-DRt4UvjI",
    authDomain: "rehablix-ai.firebaseapp.com",
    projectId: "rehablix-ai",
    storageBucket: "rehablix-ai.firebasestorage.app",
    messagingSenderId: "111840419014",
    appId: "1:111840419014:web:0fd17fa428a2b2bff14bc7",
    measurementId: "G-VF4FZ76Q46"
};

// Initialize Firebase only if not already initialized
let app;
let auth;
let database;
let analytics;

try {
    if (!firebase.apps.length) {
        // Initialize with the compat version (since we're using compat SDKs in the HTML)
        app = firebase.initializeApp(firebaseConfig);
        console.log('Firebase initialized successfully with compat SDK');
    } else {
        app = firebase.app();
        console.log('Using existing Firebase app');
    }
    
    // Get Firebase instances
    auth = firebase.auth();
    database = firebase.database();
    
    // Enable persistence for better offline experience
    auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL)
        .then(() => {
            console.log('Auth persistence enabled');
        })
        .catch((error) => {
            console.error('Auth persistence error:', error);
        });
    
    // Test database connection
    database.ref('.info/connected').on('value', (snap) => {
        if (snap.val() === true) {
            console.log('Connected to Firebase Realtime Database');
        }
    });
    
} catch (error) {
    console.error('Firebase initialization error:', error);
}

// Export for use in other modules (if using modules)
// For non-module usage, these are available globally
window.firebaseApp = app;
window.firebaseAuth = auth;
window.firebaseDatabase = database;
window.firebaseAnalytics = analytics;

// Function to fetch tokens from Firebase
async function fetchTokens() {
    try {
        if (!database) {
            console.error('Database not initialized');
            return null;
        }
        
        const snapshot = await database.ref('tokens/openAI').once('value');
        const data = snapshot.val();
        
        if (data) {
            console.log('Tokens fetched successfully');
            return {
                token: data.openai_token,
                endpoint: data.github_endpoint
            };
        } else {
            console.error('No token data found in Firebase');
            return null;
        }
    } catch (error) {
        console.error("Credential Error:", error);
        return null;
    }
}

// Make fetchTokens available globally
window.fetchTokens = fetchTokens;

console.log('Firebase config loaded with database URL from config');
