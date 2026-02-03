import { Route, Routes } from "react-router-dom";
import { CharacterCreate } from "../features/character/CharacterCreate";
import { TimelineCreate } from "../features/timeline/TimelineCreate";
import { LocationCreate } from "../features/location/LocationCreate";
import { FactionCreate } from "../features/faction/FactionCreate";
import { EventCreate } from "../features/event/EventCreate";
import { ArcCreate } from "../features/arc/ArcCreate";
import { ChapterCreate } from "../features/chapter/ChapterCreate";
import { SceneCreate } from "../features/scene/SceneCreate";
import { ItemCreate } from "../features/item/ItemCreate";
import { Dashboard } from "./Dashboard";

export const AppRouter = () => {
  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/characters" element={<CharacterCreate />} />
      <Route path="/timelines" element={<TimelineCreate />} />
      <Route path="/locations" element={<LocationCreate />} />
      <Route path="/factions" element={<FactionCreate />} />
      <Route path="/events" element={<EventCreate />} />
      <Route path="/arcs" element={<ArcCreate />} />
      <Route path="/chapters" element={<ChapterCreate />} />
      <Route path="/scenes" element={<SceneCreate />} />
      <Route path="/items" element={<ItemCreate />} />
    </Routes>
  );
};
