# Roomie Firestore Security Specification

## 1. Data Invariants
1. **Owner-Only PII Isolation (`/users`)**: `/users/{userId}` holds `email` and is readable/writable/deletable strictly by `request.auth.uid == userId`. No `list` allowed.
2. **Matchable Profiles (`/profiles`)**: A user can write/delete only their own profile (`isOwner(userId)`) with `isDemo == false`. Signed-in users may seed missing `demo_*` profiles (`isDemo == true && isComplete == true`) on `create`, and may read (`get` / `list`) other profiles ONLY when `isComplete == true`. Never store `email` or `phone` in `profiles`. No `emailVerified` requirement is imposed on signed-in users.
3. **Connect Requests (`/requests`)**: Created only by the sender (`fromUserId == request.auth.uid`, `status == 'pending'`, `toUserId != fromUserId`, no `emailVerified` check). Updated while `status == 'pending'` by receiver (`'accepted' | 'declined'`), sender (`'cancelled'`), or sender (`'accepted'` ONLY when `isDemoProfile(toUserId)` is true); sender may also re-send a `'cancelled'` request back to `'pending'`. Readable only by sender or receiver.
4. **Chats & Messages (`/chats`, `/messages`)**: Readable/writable ONLY by participants of an accepted connection (`get(requests/$(requestId)).data.status == 'accepted'`). Message `senderId` must match `request.auth.uid` (or be a participant `demo_*` profile with `isDemo == true` for the demo welcome message), and `participantIds` must match the parent chat.
5. **Safety (`/reports`, `/blocks`)**: Creatable only by the acting user (`byUserId == request.auth.uid`, `targetUserId != request.auth.uid`). Reports are append-only (`update, delete: false`). Blocks may be deleted only by `byUserId` (unblock / account deletion).

## 2. Adversarial Payloads (Expected: PERMISSION_DENIED)
1. Unauthenticated read of `/profiles/{userId}`.
2. Reading an incomplete profile (`isComplete == false`) belonging to another user.
3. Writing `/profiles/{otherUserId}` or setting `isDemo: true` on a non-`demo_*` user ID.
4. Injecting `email` or unknown keys into `/profiles/{userId}`.
5. Creating a `/requests/{id}` with `fromUserId != request.auth.uid` or `status: 'accepted'`.
6. Sender trying to update their own pending request to `status: 'accepted'` when `toUserId` is NOT a `demo_*` profile with `isDemo == true`.
7. Creating a `/chats/{id}` referencing a `pending` or `declined` request.
8. Posting to `/messages/{id}` for a chat where `request.auth.uid` is not a participant, or spoofing a non-demo `senderId`.
9. Updating `/messages/{id}` to rewrite `text` or `senderId`.
10. Creating a `/reports/{id}` or `/blocks/{id}` with spoofed `byUserId`.
11. Listing `/reports` belonging to another user.
12. Deleting another user's `/blocks/{id}` or `/profiles/{id}`.
