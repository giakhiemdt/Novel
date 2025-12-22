export type FactionPayload = {
  id?: string;
  name: string;
  alias?: string[];
  type?: string;
  alignment?: string;
  isPublic?: boolean;
  isCanon?: boolean;
  ideology?: string;
  goal?: string;
  doctrine?: string;
  taboos?: string[];
  powerLevel?: number;
  influenceScope?: string;
  militaryPower?: string;
  specialAssets?: string[];
  leadershipType?: string;
  leaderTitle?: string;
  hierarchyNote?: string;
  memberPolicy?: string;
  foundingStory?: string;
  ageEstimate?: string;
  majorConflicts?: string[];
  reputation?: string;
  currentStatus?: string;
  currentStrategy?: string;
  knownEnemies?: string[];
  knownAllies?: string[];
  notes?: string;
  tags?: string[];
};

export type Faction = FactionPayload & {
  createdAt?: string;
  updatedAt?: string;
};
