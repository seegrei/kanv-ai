import { initializeApp } from 'firebase/app';
import { getAnalytics } from 'firebase/analytics';
import { createLogger } from '../../utils/logger';

const logger = createLogger('Analytics');

class AnalyticsService {
    constructor() {
        this.analytics = null;
        this.enabled = false;
        this.initialize();
    }

    initialize() {
        const firebaseConfig = {
            apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
            authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
            projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
            storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
            messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
            appId: import.meta.env.VITE_FIREBASE_APP_ID,
            measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
        };

        if (firebaseConfig.apiKey && firebaseConfig.appId) {
            try {
                const app = initializeApp(firebaseConfig);
                this.analytics = getAnalytics(app);
                this.enabled = true;
                logger.info('Firebase Analytics initialized');
            } catch (error) {
                logger.warn('Failed to initialize Firebase:', error.message);
                this.enabled = false;
            }
        } else {
            logger.info('Firebase Analytics not configured (this is OK for public builds)');
        }
    }
}

export default new AnalyticsService();
