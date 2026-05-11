# API Surface

The MVP data features are Firestore-first. My Assignments, Records, Territories, onboarding, membership, groups, notifications, profile, and reports use Firebase Auth plus client Firestore hooks with offline persistence.

The app no longer keeps auth/profile resource routes in front of Firestore. Firebase Auth owns sign-in, registration, password updates, and Google social sign-in. Profile metadata lives in Firestore user documents and updates through realtime snapshots.

New MVP data work should prefer Firestore hooks, Firebase Auth state, and realtime snapshots over resource API routes or manual invalidation.
