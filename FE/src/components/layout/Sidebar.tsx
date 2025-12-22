import { NavLink } from "react-router-dom";

const navItems = [
  { to: "/", label: "Overview" },
  { to: "/characters", label: "Characters" },
  { to: "/timelines", label: "Timelines" },
  { to: "/locations", label: "Locations" },
  { to: "/factions", label: "Factions" },
];

export const Sidebar = () => {
  return (
    <aside className="sidebar">
      <div>
        <div className="sidebar__brand">Novel World</div>
        <p className="header__subtitle" style={{ color: "#d7c8b6" }}>
          Narrative operations console
        </p>
      </div>
      <nav className="sidebar__nav">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              isActive ? "sidebar__link sidebar__link--active" : "sidebar__link"
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div className="notice" style={{ background: "rgba(255,255,255,0.12)", color: "#f8efe2" }}>
        Sync with the backend to keep your lore consistent.
      </div>
    </aside>
  );
};
