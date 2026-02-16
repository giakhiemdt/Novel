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
import { RelationshipCreate } from "../features/relationship/RelationshipCreate";
import { RelationshipTypeCreate } from "../features/relationship-type/RelationshipTypeCreate";
import { EnergyTypeCreate } from "../features/energy-type/EnergyTypeCreate";
import { EnergyTierCreate } from "../features/energy-tier/EnergyTierCreate";
import { ConflictCheck } from "../features/conflict/ConflictCheck";
import { WorldRuleCreate } from "../features/worldrule/WorldRuleCreate";
import { RaceCreate } from "../features/race/RaceCreate";
import { RankCreate } from "../features/rank/RankCreate";
import { RankSystemCreate } from "../features/rank-system/RankSystemCreate";
import { MapSystemCreate } from "../features/map-system/MapSystemCreate";
import { SpecialAbilityCreate } from "../features/special-ability/SpecialAbilityCreate";
import { SchemaManager } from "../features/schema/SchemaManager";
import { CommandDocs } from "../features/command/CommandDocs";
import { NodeDocsPage } from "../features/node-docs/NodeDocsPage";
import { Settings } from "./Settings";
import { Dashboard } from "./Dashboard";
import { Home } from "./Home";

export const AppRouter = () => {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/overview" element={<Dashboard />} />
      <Route path="/characters" element={<CharacterCreate />} />
      <Route path="/races" element={<RaceCreate />} />
      <Route path="/rank-systems" element={<RankSystemCreate />} />
      <Route path="/ranks" element={<RankCreate />} />
      <Route path="/map-systems" element={<MapSystemCreate />} />
      <Route path="/special-abilities" element={<SpecialAbilityCreate />} />
      <Route path="/schemas" element={<SchemaManager />} />
      <Route path="/tcode-docs" element={<CommandDocs />} />
      <Route path="/node-docs" element={<NodeDocsPage />} />
      <Route path="/node-docs/:nodeId" element={<NodeDocsPage />} />
      <Route path="/timelines" element={<TimelineCreate />} />
      <Route path="/locations" element={<LocationCreate />} />
      <Route path="/factions" element={<FactionCreate />} />
      <Route path="/events" element={<EventCreate />} />
      <Route path="/arcs" element={<ArcCreate />} />
      <Route path="/chapters" element={<ChapterCreate />} />
      <Route path="/scenes" element={<SceneCreate />} />
      <Route path="/items" element={<ItemCreate />} />
      <Route path="/relationships" element={<RelationshipCreate />} />
      <Route path="/relationship-types" element={<RelationshipTypeCreate />} />
      <Route path="/energy-types" element={<EnergyTypeCreate />} />
      <Route path="/energy-tiers" element={<EnergyTierCreate />} />
      <Route path="/world-rules" element={<WorldRuleCreate />} />
      <Route path="/conflicts" element={<ConflictCheck />} />
      <Route path="/settings" element={<Settings />} />
    </Routes>
  );
};
