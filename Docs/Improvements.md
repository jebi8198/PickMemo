# PickMemo Improvement Plan

## Current Status

PickMemo is a working MVP: authentication, notebooks, cards, bulk JSON input, study sessions, feedback, and dashboard visualization are connected. The next phase is about trustworthiness: predictable validation, visible failures, stronger data consistency, and maintainability.

## Completed Baseline Improvements

- Lint and production build now pass.
- Session queue typing was tightened with explicit separator item types.
- Bulk page deletion now uses a server API instead of many client-side DELETE requests.
- JSON bulk input includes a prompt helper for external LLM conversion.
- API request validation now covers the main write routes.
- User-visible toast notifications now cover major success and failure paths.
- Focused Node tests now cover review scheduling, session queue utilities, and validation.
- The review algorithm now uses a more SM-2-inspired difficulty and interval calculation.
- Notebook and card lists now include large-dataset controls such as search, filtering, sorting, and pagination.

## Priority Work

1. API input validation - Done
   - Validate request bodies before touching MongoDB.
   - Normalize user input such as email, title, description, keywords, image URLs, and color values.
   - Put size limits on bulk inputs to avoid accidental oversized writes.

2. User-visible error handling - Done
   - Replace silent `console.error` flows with toast notifications.
   - Keep inline form errors where they are useful, but expose network/server failures globally.

3. Tests - Started
   - Added focused tests for validation, review scheduling, and session queue generation.
   - Remaining: integration-style API tests for bulk delete and route validation.

4. Study algorithm - Improved
   - Replace the current multiplier model with a better documented SM-2 or FSRS-inspired model.
   - Remaining: document the model in-product and consider FSRS fields if long-term accuracy becomes important.

5. Large dataset handling - Started
   - Add search, filters, pagination, and sorting for notebooks and cards.
   - Remaining: server-side pagination if users commonly exceed hundreds of cards per notebook.

## Follow-Up Cleanup

- Remove unused CSS files left from earlier recovery work.
- Replace `window.confirm` with app-styled confirmation dialogs.
- Add `README.md` project setup details and `.env.example`.
- Add basic authentication hardening: password policy, email normalization, and rate limiting.
