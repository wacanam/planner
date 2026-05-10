export interface HouseholdRecord {
  id: string;
  name: string;
  address: string;
  membersCount: number;
  notes?: string | null;
  latitude: number;
  longitude: number;
  territoryId?: string | null;
  congregationId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface VisitRecord {
  id: string;
  householdId: string;
  outcome: string;
  notes?: string | null;
  visitDate: string;
  createdAt: string;
  updatedAt: string;
}

export interface EncounterRecord {
  id: string;
  visitId: string;
  householdId: string;
  name: string;
  response: string;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}
