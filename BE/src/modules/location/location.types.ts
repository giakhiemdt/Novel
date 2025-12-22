export type LocationInput = {
  id?: string;
  name: string;
  alias?: string[];
  type?: string;
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
};
