# Roomie — College Roommate Matching

Roomie helps college students find compatible roommates by matching lifestyle profiles, daily schedules, budgets, and shared-space boundaries.

## Running Locally

1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the development server on port 3000:
   ```bash
   npm run dev
   ```
3. Run the matching engine unit tests:
   ```bash
   npx tsx src/utils/matching.test.ts
   ```
4. Typecheck and build for production:
   ```bash
   npm run lint && npm run build
   ```

## Firebase Configuration

- Firebase web credentials and Firestore database ID live in `firebase-applet-config.json` at the project root (`src/services/firebase.ts` imports it directly).
- Firestore schema blueprint is documented in `firebase-blueprint.json` and hardened access rules are in `firestore.rules`.
- **Enabling Email/Password Authentication**:
  1. Open the [Firebase Console](https://console.firebase.google.com/) for your project.
  2. Navigate to **Authentication → Sign-in method**.
  3. Click **Add new provider**, select **Email/Password**, toggle **Enable**, and save.
  4. If Firebase Auth Email/Password is not enabled or Firebase is unavailable, Roomie automatically falls back to `localStorage` so signup, login, profile setup, matching, requests, and chat continue working seamlessly.

## How Demo Data Works

- `src/data/demoProfiles.ts` defines 15 realistic Indian college student profiles (`isDemo: true`) across Indore, Bhopal, Pune, Delhi, Bengaluru, and Kota with INR budgets and varied lifestyle weights and deal-breakers.
- On first dashboard load, `seedDemoProfiles()` (`src/services/profileService.ts`) seeds these demo profiles into local storage (`roomie_demo_profiles_v1`) and merges them with real completed profiles from Firestore.
- When you send a connect request to a demo profile, it automatically accepts after ~5 seconds and sends a friendly welcome message so you can test the full Requests → Chat flow on your own.
