import { useI18n } from "../../i18n/I18nProvider";
import type { ArcStructureArc } from "./arc.types";

export type ArcStructureProps = {
  items: ArcStructureArc[];
};

export const ArcStructure = ({ items }: ArcStructureProps) => {
  const { t } = useI18n();

  if (items.length === 0) {
    return <p className="header__subtitle">{t("No arc structure yet.")}</p>;
  }

  return (
    <div className="detail-sections">
      {items.map((arc) => (
        <section key={arc.id} className="detail-section">
          <h4 className="detail-section__title">
            {arc.order !== undefined ? `#${arc.order} - ` : ""}
            {arc.name}
          </h4>
          {arc.summary && <p className="header__subtitle">{arc.summary}</p>}
          {arc.chapters.length === 0 ? (
            <p className="header__subtitle">{t("No chapters yet.")}</p>
          ) : (
            arc.chapters.map((chapter) => (
              <div key={chapter.id} style={{ marginTop: "12px" }}>
                <strong>
                  {chapter.order !== undefined ? `#${chapter.order} - ` : ""}
                  {chapter.name}
                </strong>
                {chapter.summary && (
                  <div className="header__subtitle">{chapter.summary}</div>
                )}
                {chapter.scenes.length === 0 ? (
                  <div className="header__subtitle">{t("No scenes yet.")}</div>
                ) : (
                  <ul style={{ margin: "8px 0 0 16px" }}>
                    {chapter.scenes.map((scene) => (
                      <li key={scene.id}>
                        {scene.order !== undefined ? `#${scene.order} - ` : ""}
                        {scene.name}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))
          )}
        </section>
      ))}
    </div>
  );
};
