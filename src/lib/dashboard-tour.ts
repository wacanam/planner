// src/lib/dashboard-tour.ts
// Configuration, types, and persistence utilities for the comprehensive app tour guide.

export interface TourHighlight {
  icon: string;
  title: string;
  description: string;
}

export interface TourStep {
  id: string;
  category: string;
  title: string;
  subtitle?: string;
  description: string;
  targetSelector?: string;
  iconName: string;
  highlights: TourHighlight[];
  tip?: string;
  actionHint?: string;
}

export const TOUR_STORAGE_KEY_PREFIX = 'kanataran_dashboard_tour_completed_';

/**
 * Check if the user has already completed or dismissed the dashboard tour.
 */
export function hasCompletedTour(userId?: string | null): boolean {
  if (typeof window === 'undefined' || !window.localStorage) {
    return false;
  }
  try {
    const key = `${TOUR_STORAGE_KEY_PREFIX}${userId || 'guest'}`;
    return window.localStorage.getItem(key) === 'true';
  } catch {
    return false;
  }
}

/**
 * Mark the dashboard tour as completed for the current user.
 */
export function markTourCompleted(userId?: string | null): void {
  if (typeof window === 'undefined' || !window.localStorage) {
    return;
  }
  try {
    const key = `${TOUR_STORAGE_KEY_PREFIX}${userId || 'guest'}`;
    window.localStorage.setItem(key, 'true');
  } catch (err) {
    console.error('Failed to save tour completion status:', err);
  }
}

/**
 * Reset the tour completion status to allow replaying on initial load.
 */
export function resetTour(userId?: string | null): void {
  if (typeof window === 'undefined' || !window.localStorage) {
    return;
  }
  try {
    const key = `${TOUR_STORAGE_KEY_PREFIX}${userId || 'guest'}`;
    window.localStorage.removeItem(key);
  } catch (err) {
    console.error('Failed to reset tour status:', err);
  }
}

export const DASHBOARD_TOUR_STEPS: TourStep[] = [
  {
    id: 'welcome-overview',
    category: 'Workspace Hub',
    title: 'Welcome to Kanataran',
    subtitle: 'Your Central Ministry Workspace',
    description:
      'Kanataran is your modern, offline-first congregation workspace designed for managing field ministry territories, household records, door-to-door visits, and partner collaboration.',
    targetSelector: '[data-tour="welcome-banner"]',
    iconName: 'Sparkles',
    highlights: [
      {
        icon: 'Building2',
        title: 'Congregation Workspace',
        description: 'Access your specific congregation territory database and shared ministry records.',
      },
      {
        icon: 'Shield',
        title: 'Role-Based Access',
        description: 'Features dynamically adapt to your role: Publisher, Territory Servant, Service Overseer, or Admin.',
      },
      {
        icon: 'Zap',
        title: 'Instant Action Triggers',
        description: 'Launch your active territory maps or browse available assignments with a single tap.',
      },
    ],
    tip: 'You can replay this interactive tour anytime using the Tour Guide button in this banner.',
  },
  {
    id: 'live-stats',
    category: 'Live Metrics',
    title: 'Real-time Ministry Overview',
    subtitle: 'Congregation Stats & Territory Health',
    description:
      'Stay updated with live metrics tracking territory availability, personal assignments, door records, and congregation publishers.',
    targetSelector: '[data-tour="stats-grid"]',
    iconName: 'BarChart3',
    highlights: [
      {
        icon: 'MapPin',
        title: 'Total Territories',
        description: 'View total congregation territories and instantly see how many are available for checkout.',
      },
      {
        icon: 'Compass',
        title: 'My Assignments',
        description: 'Keep track of active territories currently checked out to you or your service group.',
      },
      {
        icon: 'Home',
        title: 'Door Records & Pinning',
        description: 'Monitor total household records and receive alerts if any doors need GPS map pinning.',
      },
      {
        icon: 'Users',
        title: 'Publishers Directory',
        description: 'Quick count of active congregation members working together in the territory.',
      },
    ],
    tip: 'Stat cards automatically update in real-time as publishers log visits and check out territories.',
  },
  {
    id: 'active-assignments',
    category: 'Field Ministry',
    title: 'My Active Assignments',
    subtitle: 'Work Your Checked-Out Territories',
    description:
      'Manage territories assigned to you. Launch interactive Google Maps, view assigned boundaries, inspect household doors, and track your coverage progress.',
    targetSelector: '[data-tour="active-assignments"]',
    iconName: 'Compass',
    highlights: [
      {
        icon: 'Map',
        title: 'Launch Territory Studio',
        description: 'Open the interactive map to view exact boundaries, street paths, and household door pins.',
      },
      {
        icon: 'Clock',
        title: 'Due Dates & Turnaround',
        description: 'Monitor assignment dates and turnaround timelines to keep ministry territories fresh.',
      },
      {
        icon: 'CheckCircle2',
        title: 'Return & Endorsement Workflow',
        description: 'Submit completed territory assignments with coverage notes for overseer review.',
      },
    ],
    tip: 'Territories can be assigned directly to individual publishers or to an entire service group.',
  },
  {
    id: 'territory-management',
    category: 'Territories',
    title: 'Territory Directory & Assignment',
    subtitle: 'Browse, Checkout & Organize Territories',
    description:
      'Explore the full territory catalog of your congregation. View availability, request new territories, or assign them to publishers and service groups.',
    targetSelector: '[data-tour="nav-territories"]',
    iconName: 'MapPin',
    highlights: [
      {
        icon: 'Search',
        title: 'Filter & Search',
        description: 'Search territories by number, name, type (urban, rural, business), or status.',
      },
      {
        icon: 'PlusCircle',
        title: 'Create New Territories',
        description: 'Servants and overseers can easily add new territory numbers, names, and geographic zones.',
      },
      {
        icon: 'Send',
        title: 'Territory Requests',
        description: 'Publishers can request available territories, and overseers can approve them in one click.',
      },
    ],
    tip: 'Head over to the Territories tab anytime to discover available territory zones.',
  },
  {
    id: 'territory-studio',
    category: 'Map Studio',
    title: 'Territory Studio & Boundary Editor',
    subtitle: 'Interactive Google Maps & S-12 Printing',
    description:
      'A full-featured mapping suite with Google Maps integration, custom polygon boundaries, landmark icons, and exportable printable map cards.',
    iconName: 'Layers',
    highlights: [
      {
        icon: 'Edit3',
        title: 'Boundary Polygon Drawing',
        description: 'Draw and adjust colored territory boundary polygons directly on the interactive map surface.',
      },
      {
        icon: 'MapPin',
        title: 'Landmarks & Hazards',
        description: 'Mark landmarks (schools, churches, gates, stores) and hazard alerts for publishers.',
      },
      {
        icon: 'Printer',
        title: 'Print & PDF Export (S-12)',
        description: 'Generate high-resolution printable territory map cards and PDF documents for field service.',
      },
      {
        icon: 'Maximize2',
        title: 'GPS Location & Marker Clustering',
        description: 'Use real-time device GPS to find your location and cluster dense household pins automatically.',
      },
    ],
    tip: 'Click "Open Map" on any territory card to launch the full Territory Studio experience.',
  },
  {
    id: 'records-and-visits',
    category: 'Records & Directory',
    title: 'Household Records & Visit Logs',
    subtitle: 'Track Door-to-Door Ministry Logs',
    description:
      'Maintain an accurate record of every household door. Log field service visits, record resident outcomes, and manage return visits.',
    targetSelector: '[data-tour="records-hub"]',
    iconName: 'FileText',
    highlights: [
      {
        icon: 'Home',
        title: 'Household Directory',
        description: 'Store street names, house numbers, unit numbers, door status, and exact map coordinates.',
      },
      {
        icon: 'CheckCircle2',
        title: 'Visit Outcomes',
        description: 'Log visits with statuses: Contacted, Not Home, Busy, Literature Placed, or Do Not Call.',
      },
      {
        icon: 'BookOpen',
        title: 'Literature & Discussions',
        description: 'Keep track of publications placed and topics discussed for future follow-up.',
      },
    ],
    tip: 'Records can be pinned directly on the map or managed through the directory list.',
  },
  {
    id: 'encounters-and-sharing',
    category: 'Collaboration',
    title: 'Encounters & Record Sharing',
    subtitle: 'Bible Studies & Partner Collaboration',
    description:
      'Record person-level return visit details, language preferences, Bible study interests, and safely collaborate with your preaching partners.',
    targetSelector: '[data-tour="records-hub"]',
    iconName: 'Users',
    highlights: [
      {
        icon: 'UserCheck',
        title: 'Encounters & Study Interests',
        description: 'Record resident names, languages, age groups, and scheduled return visit appointments.',
      },
      {
        icon: 'Share2',
        title: 'Personal Record Sharing',
        description: 'Share return visits with preaching partners in Collaborate, Transfer, or View-only mode.',
      },
      {
        icon: 'Lock',
        title: 'Secure Endorsements',
        description: 'Shared records require recipient acceptance, keeping congregation data organized and private.',
      },
    ],
    tip: 'Sharing records helps preaching companions follow up on return visits seamlessly.',
  },
  {
    id: 'administration-and-reports',
    category: 'Administration',
    title: 'Congregation Governance & S-13 Reports',
    subtitle: 'Overseer Tools, Service Groups & Analytics',
    description:
      'Service Overseers and Territory Servants have powerful administrative controls to manage members, service groups, and official congregation reporting.',
    targetSelector: '[data-tour="dashboard-header"]',
    iconName: 'ShieldCheck',
    highlights: [
      {
        icon: 'UserPlus',
        title: 'Members & Access Approvals',
        description: 'Approve new publisher join requests, assign congregation roles, and manage permissions.',
      },
      {
        icon: 'FolderOpen',
        title: 'Service Groups',
        description: 'Organize publishers into field service groups with appointed Group Overseers and Assistants.',
      },
      {
        icon: 'FileSpreadsheet',
        title: 'S-13 Coverage Reports',
        description: 'Generate official S-13 territory assignment records, turnaround analytics, and export to CSV or PDF.',
      },
    ],
    tip: 'Administrative pages appear automatically in the navigation for Service Overseers and Servants.',
  },
  {
    id: 'notifications-profile-offline',
    category: 'Settings & Offline',
    title: 'Notifications, Profile & Offline Mode',
    subtitle: 'Sound Alerts, Preferences & Offline Sync',
    description:
      'Stay notified of territory and sharing updates with custom sound styles, and work uninterrupted even without an internet connection.',
    targetSelector: '[data-tour="dashboard-header"]',
    iconName: 'Wifi',
    highlights: [
      {
        icon: 'Bell',
        title: 'Real-time Notifications & Sound Styles',
        description: 'Receive instant alerts with customizable audio styles: Chime, Ding, Pop, or Subtle.',
      },
      {
        icon: 'WifiOff',
        title: '100% Offline-First Firestore Cache',
        description: 'Work in rural areas with zero signal. Changes are safely saved locally and sync automatically when online.',
      },
      {
        icon: 'User',
        title: 'Profile & Avatar Cropping',
        description: 'Customize your profile, crop avatar photos, update credentials, and manage account preferences.',
      },
    ],
    tip: 'When working offline, a subtle top banner confirms offline mode while your changes save locally.',
  },
  {
    id: 'ready-to-start',
    category: 'Ready to Start',
    title: "You're All Set!",
    subtitle: 'Start Your Ministry Workflow',
    description:
      'You now have a complete overview of Kanataran. Jump straight into your active assignments, explore congregation territories, or manage your household records.',
    iconName: 'CheckCircle2',
    highlights: [
      {
        icon: 'Compass',
        title: 'Check Your Assignments',
        description: 'Open your checked-out territories to start working door-to-door.',
      },
      {
        icon: 'MapPin',
        title: 'Browse Available Territories',
        description: 'Request a new territory zone for upcoming field service.',
      },
      {
        icon: 'Sparkles',
        title: 'Replay Anytime',
        description: 'Click the "Tour Guide" button in the dashboard welcome banner whenever you need a refresher.',
      },
    ],
    tip: 'Happy field service! Let’s get started.',
  },
];
