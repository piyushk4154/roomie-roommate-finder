# Roomie — College Roommate Matching & Student Housing

Roomie helps college students find compatible roommates by matching lifestyle profiles, daily schedules, budgets, and shared-space boundaries—and lets verified property owners list rooms, PGs, and student flats.

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

## Account Roles & Portals

- **Students (`role: "student"`)**: Complete a multi-step lifestyle profile (`/profile-setup`), browse ranked roommate matches (`/dashboard`), discover active owner properties under **Rooms & PGs** (`/dashboard/rooms`) with house-rule compatibility checks, manage requests/enquiries (`/dashboard/requests`), and chat (`/dashboard/chat`).
- **Property Owners (`role: "owner"`)**: Sign up as a room/PG owner with optional private phone number, manage active/paused/rented properties under **My Listings** (`/owner`), publish or edit listings (`/owner/listings/new`, `/owner/listings/:listingId/edit`), review student enquiries with lifestyle summaries (`/owner/requests`), and chat with students (`/owner/chat`).
- Mutual route guards prevent students from accessing `/owner/*` routes and prevent owners from accessing student roommate-matching routes.

## Privacy & Safety Controls

- Owner `email` and `phone` live in private user documents (`/users/{uid}`) and are never exposed on public `listings` or `ownerProfiles` documents.
- When an owner accepts a student's property enquiry, their optional `phone` is shared only on that private accepted `requests/{requestId}` document.
- Both roles can report users or listings (`reports`), block users (`blocks`), and delete their account along with associated listings, profiles, requests, and messages.

## Firebase Configuration

- Firebase web credentials and Firestore database ID live in `firebase-applet-config.json` at the project root (`src/services/firebase.ts` imports it directly).
- Firestore schema blueprint is documented in `firebase-blueprint.json` and hardened access rules are in `firestore.rules`.
- **Enabling Email/Password Authentication**:
  1. Open the [Firebase Console](https://console.firebase.google.com/) for your project.
  2. Navigate to **Authentication → Sign-in method**.
  3. Click **Add new provider**, select **Email/Password**, toggle **Enable**, and save.
  4. If Firebase Auth Email/Password is not enabled or Firebase is unavailable, Roomie automatically falls back to `localStorage` so signup, login, profile setup, matching, listings, requests, and chat continue working seamlessly.

## How Demo Data Works

- `src/data/demoProfiles.ts` defines 15 realistic Indian college student profiles (`isDemo: true`) across Indore, Bhopal, Pune, Delhi, Bengaluru, and Kota with INR budgets and varied lifestyle weights and deal-breakers.
- `src/data/demoListings.ts` defines 2 demo property owners and 8 active student listings (`isDemo: true`) across Indore, Bhopal, Pune, Kota, and Delhi.
- Sending a connect request to a demo student or an enquiry to a demo listing automatically accepts after ~5 seconds, reveals demo contact details, and opens a chat thread with a friendly welcome message.
