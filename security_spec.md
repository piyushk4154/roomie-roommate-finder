# Roomie Firestore Security Specification

## 1. Data Invariants
1. **Owner-Only PII Isolation (`/users`)**: `/users/{userId}` holds `email`, `phone`, and `role` (`student` | `owner`, defaulting to `student` when absent) and is readable/writable/deletable strictly by `request.auth.uid == userId`. Users cannot escalate or alter their `role` after creation. No `list` allowed.
2. **Public Owner Profiles (`/ownerProfiles`)**: Holds only public display fields (`userId`, `name`, `city`, `bio`, `avatar`, `isDemo`, `updatedAt`)—never email or phone. Writable only by verified `'owner'` accounts for their own UID (or signed-in users seeding `demo_owner_*` docs).
3. **Student Matchable Profiles (`/profiles`)**: Only `'student'` accounts (`isStudentAccount`) can create/update/delete their own profile with `isDemo == false`. Owners are strictly blocked from writing `/profiles`. Signed-in users (both students and owners) may read (`get` / `list`) completed student profiles (`isComplete == true`), and seed missing `demo_*` student profiles (`isDemo == true && isComplete == true`).
4. **Property Listings (`/listings`)**: Anyone signed in can read active listings (`status == 'active'`), and owners can read their own listings regardless of status (`ownerId == request.auth.uid`). Only `'owner'` accounts (`isOwnerAccount`) can create/update/delete listings with `ownerId == request.auth.uid`, `rentPerMonth > 0`, `totalBeds >= 1`, `availableBeds <= totalBeds`, and `authorizedConfirmed == true`. Students are strictly blocked from writing `/listings`.
5. **Connect Requests & Listing Enquiries (`/requests`)**: Created only by the sender (`fromUserId == request.auth.uid`, `status == 'pending'`, `toUserId != fromUserId`, no `ownerPhone` on create). When `listingId` is present, the referenced listing must exist. Updated while `status == 'pending'` by receiver (`'accepted' | 'declined'`, optionally revealing `ownerPhone` when accepting), sender (`'cancelled'`), or sender (`'accepted'` ONLY when `isDemoTarget(toUserId)` is true). Readable only by sender or receiver.
6. **Chats & Messages (`/chats`, `/messages`)**: Readable/writable ONLY by participants of an accepted connection (`get(requests/$(requestId)).data.status == 'accepted'`). Message `senderId` must match `request.auth.uid` (or be a participant `demo_*` student/owner profile with `isDemo == true` for the demo welcome message).
7. **Safety (`/reports`, `/blocks`)**: Creatable only by the acting user (`byUserId == request.auth.uid`, `targetUserId != request.auth.uid`), supporting optional `listingId` and `targetType`. Reports are append-only (`update, delete: false`). Blocks may be deleted only by `byUserId`.

## 2. Adversarial Payloads (Expected: PERMISSION_DENIED)
1. Unauthenticated read of `/profiles/{userId}` or `/listings/{listingId}`.
2. A student account attempting to create or update a document in `/listings/{listingId}`.
3. A property owner account attempting to create or update a document in `/profiles/{userId}`.
4. A user updating `/users/{uid}` to change their `role` from `student` to `owner`.
5. Creating a `/listings/{id}` with `rentPerMonth: 0`, `availableBeds > totalBeds`, `authorizedConfirmed: false`, or spoofed `ownerId`.
6. Reading a `paused` or `rented` listing owned by another user.
7. Reading `/users/{ownerId}` from a student session to harvest private phone or email.
8. Creating a `/requests/{id}` with `fromUserId != request.auth.uid`, `status: 'accepted'`, or pre-populated `ownerPhone`.
9. Sender trying to update their own pending request to `status: 'accepted'` when `toUserId` is NOT a `demo_*` profile/owner with `isDemo == true`.
10. Creating a `/chats/{id}` referencing a `pending` or `declined` request.
11. Posting to `/messages/{id}` for a chat where `request.auth.uid` is not a participant, or spoofing a non-demo `senderId`.
12. Creating a `/reports/{id}` or `/blocks/{id}` with spoofed `byUserId`.
