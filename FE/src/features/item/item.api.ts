import { api } from "../../services/api";
import { withDatabaseHeader } from "../../services/db";
import { endpoints } from "../../services/endpoints";
import type { Event } from "../event/event.types";
import type { Item, ItemPayload } from "./item.types";

export const getAllItems = () =>
  api.get<Item[]>(endpoints.items, withDatabaseHeader());

export const getItemsByEvent = (eventId: string) =>
  api.get<Item[]>(`${endpoints.events}/${eventId}/items`, withDatabaseHeader());

export const getEventsByItem = (itemId: string) =>
  api.get<Event[]>(`${endpoints.items}/${itemId}/events`, withDatabaseHeader());

export const createItem = (payload: ItemPayload) =>
  api.post<Item>(endpoints.items, payload, withDatabaseHeader());

export const updateItem = (id: string, payload: ItemPayload) =>
  api.put<Item>(`${endpoints.items}/${id}`, payload, withDatabaseHeader());

export const deleteItem = (id: string) =>
  api.delete<void>(`${endpoints.items}/${id}`, withDatabaseHeader());

export const linkItemEvent = (itemId: string, eventId: string) =>
  api.post<{ message: string }>(
    `${endpoints.items}/${itemId}/event`,
    { eventId },
    withDatabaseHeader()
  );

export const unlinkItemEvent = (itemId: string) =>
  api.delete<{ message: string }>(
    `${endpoints.items}/${itemId}/event`,
    withDatabaseHeader()
  );
