import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import { Button } from "../common/Button";
import { useToast } from "../common/Toast";
import { MultiSelect } from "../form/MultiSelect";
import { Select } from "../form/Select";
import { TextArea } from "../form/TextArea";
import { TextInput } from "../form/TextInput";
import { createProject, getProjects } from "../../features/project/project.api";
import type {
  ProjectInput,
  ProjectNode,
  ProjectStatus,
} from "../../features/project/project.types";
import { useI18n } from "../../i18n/I18nProvider";

type SidebarProps = {
  collapsed: boolean;
  onToggle: () => void;
};

const navSections = [
  {
    title: "Worldbuilding",
    items: [
      { to: "/", label: "Overview", shortLabel: "O" },
      { to: "/characters", label: "Characters", shortLabel: "C" },
      { to: "/locations", label: "Locations", shortLabel: "L" },
      { to: "/factions", label: "Factions", shortLabel: "F" },
      { to: "/items", label: "Items", shortLabel: "I" },
      { to: "/world-rules", label: "World Rules", shortLabel: "W" },
    ],
  },
  {
    title: "Story",
    items: [
      { to: "/timelines", label: "Timelines", shortLabel: "T" },
      { to: "/events", label: "Events", shortLabel: "E" },
      { to: "/arcs", label: "Arcs", shortLabel: "A" },
      { to: "/chapters", label: "Chapters", shortLabel: "H" },
      { to: "/scenes", label: "Scenes", shortLabel: "S" },
      { to: "/relationships", label: "Relationships", shortLabel: "R" },
    ],
  },
  {
    title: "System",
    items: [{ to: "/conflicts", label: "Conflicts", shortLabel: "X" }],
  },
];

export const Sidebar = ({ collapsed, onToggle }: SidebarProps) => {
  const { language, setLanguage, t } = useI18n();
  const { notify } = useToast();
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [projects, setProjects] = useState<ProjectNode[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [selectedDbName, setSelectedDbName] = useState("");
  const [isLoadingProjects, setIsLoadingProjects] = useState(false);
  const [form, setForm] = useState({
    id: "",
    name: "",
    description: "",
    dbName: "",
    status: "active" as ProjectStatus,
    notes: "",
    tags: [] as string[],
  });

  const loadProjects = async () => {
    setIsLoadingProjects(true);
    try {
      const data = await getProjects();
      setProjects(data);
      if (data.length && !selectedProjectId) {
        const storedDb = localStorage.getItem("novel-selected-project-db");
        const storedProject = storedDb
          ? data.find((item) => item.dbName === storedDb)
          : undefined;
        const selected = storedProject ?? data[0];
        setSelectedProjectId(selected.id);
        setSelectedDbName(selected.dbName);
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to load projects";
      notify(message, "error");
    } finally {
      setIsLoadingProjects(false);
    }
  };

  useEffect(() => {
    void loadProjects();
  }, []);

  useEffect(() => {
    if (!selectedDbName) {
      return;
    }
    localStorage.setItem("novel-selected-project-db", selectedDbName);
  }, [selectedDbName]);

  useEffect(() => {
    if (!isProjectModalOpen && !isSettingsOpen) {
      document.body.style.overflow = "";
      document.body.style.paddingRight = "";
      return;
    }

    const scrollbarWidth =
      window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = "hidden";
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }

    return () => {
      document.body.style.overflow = "";
      document.body.style.paddingRight = "";
    };
  }, [isProjectModalOpen, isSettingsOpen]);

  const resetForm = () => {
    setForm({
      id: "",
      name: "",
      description: "",
      dbName: "",
      status: "active",
      notes: "",
      tags: [],
    });
  };

  const openModal = () => {
    resetForm();
    setIsProjectModalOpen(true);
  };

  const openSettings = () => {
    setIsSettingsOpen(true);
  };

  const closeModal = () => {
    setIsProjectModalOpen(false);
  };

  const closeSettings = () => {
    setIsSettingsOpen(false);
  };

  const handleProjectChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const nextId = event.target.value;
    if (nextId === "__create__") {
      openModal();
      return;
    }
    setSelectedProjectId(nextId);
    const match = projects.find((project) => project.id === nextId);
    const nextDbName = match?.dbName ?? "";
    setSelectedDbName(nextDbName);
    if (nextDbName) {
      localStorage.setItem("novel-selected-project-db", nextDbName);
    }
    window.dispatchEvent(new Event("novel-project-changed"));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);

    const payload: ProjectInput = {
      name: form.name.trim(),
      dbName: form.dbName.trim(),
      status: form.status,
    };

    if (form.id.trim()) {
      payload.id = form.id.trim();
    }
    if (form.description.trim()) {
      payload.description = form.description.trim();
    }
    if (form.notes.trim()) {
      payload.notes = form.notes.trim();
    }
    if (form.tags.length) {
      payload.tags = form.tags;
    }

    try {
      const created = await createProject(payload);
      setProjects((prev) => [
        created,
        ...prev.filter((item) => item.id !== created.id),
      ]);
      setSelectedProjectId(created.id);
      closeModal();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to create project";
      notify(message, "error");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <aside className={`sidebar ${collapsed ? "sidebar--collapsed" : ""}`}>
        <div className="sidebar__top">
          <button
            className="sidebar__toggle"
            onClick={onToggle}
            type="button"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? ">" : "<"}
          </button>
        </div>
        <nav className="sidebar__nav">
          {navSections.map((section) => (
            <div className="sidebar__section" key={section.title}>
              {!collapsed && (
                <span className="sidebar__section-title">
                  {t(section.title)}
                </span>
              )}
              {section.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    isActive ? "sidebar__link sidebar__link--active" : "sidebar__link"
                  }
                >
                  <span className="sidebar__icon">{item.shortLabel}</span>
                  <span className="sidebar__label">{t(item.label)}</span>
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
        <div className="sidebar__project">
          <span className="sidebar__project-label">{t("Project")}</span>
          <select
            className="sidebar__project-select"
            value={selectedProjectId}
            onChange={handleProjectChange}
            disabled={isLoadingProjects}
          >
            {projects.length === 0 && (
              <option value="">
                {isLoadingProjects
                  ? t("Loading projects...")
                  : t("No projects yet")}
              </option>
            )}
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
            <option value="__create__">{t("Create new project")}</option>
          </select>
        </div>
        <div className="sidebar__actions">
          <Button
            type="button"
            variant="ghost"
            className="sidebar__settings"
            onClick={openSettings}
          >
            <span className="sidebar__settings-icon">⚙</span>
            <span className="sidebar__settings-label">{t("Settings")}</span>
          </Button>
        </div>
      </aside>
      {isProjectModalOpen && (
        <div className="modal__backdrop" onClick={closeModal}>
          <div
            className="modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal__header">
              <div>
                <h3>{t("Create project")}</h3>
                <p className="modal__subtitle">
                  {t("Set up a new workspace database for this story.")}
                </p>
              </div>
              <button
                className="modal__close"
                type="button"
                onClick={closeModal}
                aria-label="Close modal"
              >
                ✕
              </button>
            </div>
            <form className="modal__body" onSubmit={handleSubmit}>
              <div className="modal__grid">
                <TextInput
                  label="Project ID"
                  value={form.id}
                  onChange={(value) => setForm((prev) => ({ ...prev, id: value }))}
                  placeholder="Leave blank to auto-generate"
                />
                <TextInput
                  label="Name"
                  value={form.name}
                  onChange={(value) => setForm((prev) => ({ ...prev, name: value }))}
                  required
                />
                <TextInput
                  label="Database Name"
                  value={form.dbName}
                  onChange={(value) => setForm((prev) => ({ ...prev, dbName: value }))}
                  placeholder="letters, numbers, _ or -"
                  required
                />
                <Select
                  label="Status"
                  value={form.status}
                  onChange={(value) =>
                    setForm((prev) => ({ ...prev, status: value as ProjectStatus }))
                  }
                  options={[
                    { label: "Active", value: "active" },
                    { label: "Archived", value: "archived" },
                  ]}
                  required
                />
                <TextArea
                  label="Description"
                  value={form.description}
                  onChange={(value) =>
                    setForm((prev) => ({ ...prev, description: value }))
                  }
                  placeholder="Short summary of the project"
                />
                <TextArea
                  label="Notes"
                  value={form.notes}
                  onChange={(value) => setForm((prev) => ({ ...prev, notes: value }))}
                  placeholder="Optional notes"
                />
                <MultiSelect
                  label="Tags"
                  values={form.tags}
                  onChange={(values) => setForm((prev) => ({ ...prev, tags: values }))}
                  placeholder="Type a tag and press Enter"
                />
              </div>
              <div className="modal__footer">
                <Button type="button" variant="ghost" onClick={closeModal}>
                  {t("Cancel")}
                </Button>
                <Button type="submit" disabled={isSaving}>
                  {isSaving ? t("Creating...") : t("Create project")}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
      {isSettingsOpen && (
        <div className="modal__backdrop" onClick={closeSettings}>
          <div className="modal" onClick={(event) => event.stopPropagation()}>
            <div className="modal__header">
              <div>
                <h3>{t("Settings")}</h3>
                <p className="modal__subtitle">{t("Display language")}</p>
              </div>
              <button
                className="modal__close"
                type="button"
                onClick={closeSettings}
                aria-label="Close modal"
              >
                ✕
              </button>
            </div>
            <div className="modal__body">
              <Select
                label="Display language"
                value={language}
                onChange={(value) => setLanguage(value as "en" | "vi")}
                options={[
                  { label: "English", value: "en" },
                  { label: "Vietnamese", value: "vi" },
                ]}
              />
            </div>
            <div className="modal__footer">
              <Button type="button" variant="ghost" onClick={closeSettings}>
                {t("Cancel")}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
