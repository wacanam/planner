# Kanataran Mobile (React Native + Expo)

A native mobile territory and ministry management app for Jehovah's Witnesses publishers and congregation servants, built with **React Native**, **Expo SDK 52+**, and **Expo Router**.

---

## 🚀 Key Features

- **Auth & Direct Workspace Routing (No Landing Page)**: Immediately routes authenticated publishers to their active congregation workspace and territory dashboard.
- **My Assignments (Tab 1)**:
  - Interactive map view powered by `react-native-maps` with territory polygon boundaries, color-coded door pins, and publisher GPS location with "re-center on me" support.
  - Interactive pin tap with door bottom sheet & direct "Log Visit / Encounter" modal.
  - Check in / return territory workflow.
- **Territories Catalog (Tab 2)**:
  - Complete congregation territory directory with search, status filters (Available, Assigned, Completed), and service group filters.
  - Territory details with boundary polygon map, coverage stats, request territory action, and servant assignment management.
  - Territory creation for servants & overseers.
- **Ministry Records (Tab 3)**:
  - Segmented views for **Households**, **Visits**, and **Encounters**.
  - Household profile with full chronological visit history and collaborator sharing.
  - GPS-assisted household pinning.
- **More & Congregation Tools (Tab 4)**:
  - **Reports & Authentic S-13 PDF Export**: High-resolution vector S-13 Congregation Territory Assignment Record generator using `expo-print` + native mobile sharing (`expo-sharing`).
  - **Service Groups**: Group organization and overseer management.
  - **Members Directory**: Publisher roles and join request approval.
  - **Notifications**: Real-time alerts on assignments and approvals.
  - **Pastel Design System**: Faithful implementation of Kanataran's pastel theme with seamless Light Mode (`#F5F3F0`) and Dark Mode (`#1A1A1A`) support.
  - **Audio & Haptics**: Notification audio chimes and tactile haptic feedback on visits and pins.

---

## 🛠️ Tech Stack & Dependencies

- **Framework**: Expo SDK 52 with Expo Router 4
- **Navigation**: Expo Router (file-based routing with bottom tabs, stacks, and modals)
- **Styling**: Pure React Native `StyleSheet` with central Pastel Theme System tokens (`mobile/src/lib/theme.ts`)
- **Maps**: `react-native-maps`
- **Backend & Database**: Firebase Auth with AsyncStorage persistence + Firestore offline local cache
- **Device Integrations**: `expo-location`, `expo-haptics`, `expo-av`, `expo-print`, `expo-sharing`
- **Icons**: `lucide-react-native`

---

## 📦 Getting Started

### 1. Install Dependencies

```bash
cd mobile
bun install
```

### 2. Start Development Server

```bash
# Start Metro bundler with Expo
bun start

# Or directly target device/emulator:
bun android
bun ios
```

### 3. Type Checking

```bash
bun run typecheck
```

---

## 📁 Architecture Overview

```
mobile/
├── app/
│   ├── _layout.tsx                     # Root provider (Theme, Auth, SafeArea, OfflineBanner)
│   ├── index.tsx                       # Auth gate & splash redirector (no landing page)
│   ├── (auth)/                         # Login, Register, Reset Password
│   ├── select-congregation.tsx         # Congregation selector / join modal
│   └── (tabs)/                         # 4-Tab bottom navigation
│       ├── _layout.tsx                 # Tab bar configuration
│       ├── assignments/                # Field work & interactive maps
│       ├── territories/                # Territory directory & creator
│       ├── records/                    # Households, visits & encounters
│       └── more/                       # Reports, S-13 PDF, groups, members, settings
├── src/
│   ├── components/ui/                  # Button, Card, Input, Badge, Header, EmptyState, OfflineBanner
│   ├── context/                        # AuthContext & ThemeContext
│   ├── hooks/                          # Real-time Firestore hooks (useTerritories, useAssignments, etc.)
│   ├── lib/                            # Firebase, Theme tokens, Roles, Permissions, PDF Export, Sound
│   └── types/                          # Shared API & Firestore schemas
├── app.json                            # Expo app configuration
└── package.json                        # Mobile dependencies
```
