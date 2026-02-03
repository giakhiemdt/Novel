export type LocationInput = {
  id?: string;
  name: string;
  alias?: string[];
  type?: string;
  typeDetail?: string;
  category?: string;
  isHabitable?: boolean;
  isSecret?: boolean;
  terrain?: string;
  climate?: string;
  environment?: string;
  naturalResources?: string[];
  powerDensity?: string;
  dangerLevel?: number;
  anomalies?: string[];
  restrictions?: string[];
  historicalSummary?: string;
  legend?: string;
  ruinsOrigin?: string;
  currentStatus?: string;
  controlledBy?: string;
  populationNote?: string;
  notes?: string;
  tags?: string[];
};

export type LocationNode = LocationInput & {
  createdAt: string;
  updatedAt: string;
  parentId?: string;
  contains?: {
    sinceYear?: number | null;
    untilYear?: number | null;
    note?: string | null;
  };
};

export type LocationListQuery = {
  limit?: number;
  offset?: number;
  q?: string;
  name?: string;
  tag?: string;
  type?: string;
  category?: string;
  isSecret?: boolean;
  isHabitable?: boolean;
  parentId?: string;
};
