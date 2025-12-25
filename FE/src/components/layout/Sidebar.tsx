import { FormEvent, useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import { Button } from "../common/Button";
import { ErrorMessage } from "../common/ErrorMessage";
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

type SidebarProps = {
  collapsed: boolean;
  onToggle: () => void;
};

const navItems = [
  { to: "/", label: "Overview", shortLabel: "O" },
  { to: "/characters", label: "Characters", shortLabel: "C" },
  { to: "/timelines", label: "Timelines", shortLabel: "T" },
  { to: "/locations", label: "Locations", shortLabel: "L" },
  { to: "/factions", label: "Factions", shortLabel: "F" },
];

export const Sidebar = ({ collapsed, onToggle }: SidebarProps) => {
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [projects, setProjects] = useState<ProjectNode[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [projectError, setProjectError] = useState<string | null>(null);
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
    setProjectError(null);
    try {
      const data = await getProjects();
      setProjects(data);
      if (data.length && !selectedProjectId) {
        setSelectedProjectId(data[0].id);
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to load projects";
      setProjectError(message);
    } finally {
      setIsLoadingProjects(false);
    }
  };

  useEffect(() => {
    void loadProjects();
  }, []);

  useEffect(() => {
    if (!isProjectModalOpen) {
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
  }, [isProjectModalOpen]);

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
    setErrorMessage(null);
    setIsProjectModalOpen(true);
  };

  const closeModal = () => {
    setIsProjectModalOpen(false);
    setErrorMessage(null);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);
    setErrorMessage(null);

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
      setErrorMessage(message);
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
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                isActive ? "sidebar__link sidebar__link--active" : "sidebar__link"
              }
            >
              <span className="sidebar__icon">{item.shortLabel}</span>
              <span className="sidebar__label">{item.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar__project">
          <span className="sidebar__project-label">Project</span>
          <select
            className="sidebar__project-select"
            value={selectedProjectId}
            onChange={(event) => setSelectedProjectId(event.target.value)}
            disabled={isLoadingProjects || projects.length === 0}
          >
            {projects.length === 0 && (
              <option value="">
                {isLoadingProjects ? "Loading projects..." : "No projects yet"}
              </option>
            )}
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
          {projectError && (
            <span className="sidebar__project-error">{projectError}</span>
          )}
        </div>
        <div className="sidebar__actions">
          <Button
            type="button"
            className="sidebar__new-project"
            onClick={openModal}
          >
            <span className="sidebar__new-project-icon">+</span>
            <span className="sidebar__new-project-label">New Project</span>
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
                <h3>Create project</h3>
                <p className="modal__subtitle">
                  Set up a new workspace database for this story.
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
              {errorMessage && <ErrorMessage message={errorMessage} />}
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
                  Cancel
                </Button>
                <Button type="submit" disabled={isSaving}>
                  {isSaving ? "Creating..." : "Create project"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
