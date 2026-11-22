# 🏠 Roomie

Find a roommate who fits your life.

Roomie helps college students find compatible roommates by matching lifestyle profiles: smoking, drinking, sleep schedule, noise, cleanliness, guests, diet, pets and more.

## Features
- Email/password signup and login (Firebase Auth)
- 6-step profile setup with importance ratings and deal-breakers
- Smart matching: deal-breaker filter, then a weighted compatibility score
- Match dashboard with filters (city, college, budget, gender, minimum score)
- Trait-by-trait comparison with explanations
- Connect requests and real-time chat
- Report and block for safety

## How matching works
1. **Deal-breakers:** incompatible pairs are removed completely (smoking, drinking, gender preference, budget overlap).
2. **Weighted score:** each trait gets a similarity from 0 to 1, multiplied by the importance weight (1-5) you set.
3. **Mutual score:** A's view of B and B's view of A are averaged.

## Tech stack
React, TypeScript, Tailwind CSS, React Router, Firebase Auth, Firestore, Vite

## Run locally
1. `npm install`
2. Add your Firebase config (see `firebase-applet-config.json` or the config file in `src/services`)
3. `npm run dev`

## Team
Built for [Hackathon Name] by [Your Name / Team]

## Live demo
[your-link-here]
