import { api } from "../../services/api";
import { endpoints } from "../../services/endpoints";
import type { Location, LocationPayload } from "./location.types";

export const getAllLocations = () =>
  api.get<Location[]>(endpoints.locations);

export const createLocation = (payload: LocationPayload) =>
  api.post<Location>(endpoints.locations, payload);
