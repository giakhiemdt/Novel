import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useI18n } from "../../i18n/I18nProvider";
import { nodeDocById, nodeDocs } from "./node-docs.data";

export const NodeDocsPage = () => {
  const { t } = useI18n();
  const navigate = useNavigate();
  const params = useParams<{ nodeId?: string }>();
  const [query, setQuery] = useState("");

  const normalized = query.trim().toLowerCase();

  const filtered = useMemo(() => {
    if (!normalized) {
      return nodeDocs;
    }
    return nodeDocs.filter((node) => {
      const haystack =
        `${node.name} ${node.nodeLabel} ${node.module} ${node.tCode ?? ""} ${node.route ?? ""} ${
          node.purpose
        }`.toLowerCase();
      return haystack.includes(normalized);
    });
  }, [normalized]);

  const selected = useMemo(() => {
    const byParam = params.nodeId ? nodeDocById.get(params.nodeId) : undefined;
    if (byParam) {
      return byParam;
    }
    return filtered[0] ?? null;
  }, [filtered, params.nodeId]);

  return (
    <div className="card">
      <div className="card__header">
        <div>
          <h3 className="section-title">{t("Node Documentation")}</h3>
          <p className="header__subtitle">
            {t("Browse nodes and open detailed data contracts.")}
          </p>
        </div>
      </div>

      <div className="form-field--wide">
        <input
          className="input"
          placeholder={t("Search node...")}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>

      <div className="node-docs-layout">
        <aside className="node-docs-list" aria-label={t("Node list")}>
          {filtered.length === 0 ? (
            <p className="header__subtitle">{t("No nodes match your search.")}</p>
          ) : (
            filtered.map((node) => {
              const isActive = selected?.id === node.id;
              return (
                <button
                  key={node.id}
                  type="button"
                  className={`node-docs-item${isActive ? " node-docs-item--active" : ""}`}
                  onClick={() => navigate(`/node-docs/${node.id}`)}
                >
                  <span className="node-docs-item__name">{node.name}</span>
                  <span className="node-docs-item__meta">
                    {node.nodeLabel}
                    {node.tCode ? ` • ${t("T-code")}: ${node.tCode}` : ""}
                  </span>
                </button>
              );
            })
          )}
        </aside>

        <section className="node-docs-detail" aria-live="polite">
          {!selected ? (
            <p className="header__subtitle">{t("Select a node from the list.")}</p>
          ) : (
            <>
              <div className="node-docs-detail__header">
                <h4>{selected.name}</h4>
                <div className="node-docs-pill-row">
                  <span className="node-docs-pill">Label: {selected.nodeLabel}</span>
                  <span className="node-docs-pill">Module: {selected.module}</span>
                  {selected.tCode && (
                    <span className="node-docs-pill">{t("T-code")}: {selected.tCode}</span>
                  )}
                  {selected.route && (
                    <span className="node-docs-pill">Route: {selected.route}</span>
                  )}
                </div>
                <p className="header__subtitle">{selected.purpose}</p>
              </div>

              <div className="node-docs-section">
                <h5>{t("Required fields")}</h5>
                <ul>
                  {selected.requiredFields.map((field) => (
                    <li key={`required-${field}`}>{field}</li>
                  ))}
                </ul>
              </div>

              <div className="node-docs-section">
                <h5>{t("Optional fields")}</h5>
                <ul>
                  {selected.optionalFields.map((field) => (
                    <li key={`optional-${field}`}>{field}</li>
                  ))}
                </ul>
              </div>

              <div className="node-docs-section">
                <h5>{t("Graph relations")}</h5>
                <ul>
                  {selected.relations.map((relation) => (
                    <li key={`relation-${relation}`}>{relation}</li>
                  ))}
                </ul>
              </div>

              <div className="node-docs-section">
                <h5>{t("Main APIs")}</h5>
                <ul>
                  {selected.apis.map((api) => (
                    <li key={`api-${api}`}>{api}</li>
                  ))}
                </ul>
              </div>

              <div className="node-docs-section">
                <h5>{t("Notes")}</h5>
                <ul>
                  {selected.notes.map((note) => (
                    <li key={`note-${note}`}>{note}</li>
                  ))}
                </ul>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
};
