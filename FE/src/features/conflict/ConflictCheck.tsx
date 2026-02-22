import { useEffect, useState } from "react";
import { useI18n } from "../../i18n/I18nProvider";
import { useToast } from "../../components/common/Toast";
import { getConflictReport } from "./conflict.api";
import type { ConflictReport } from "./conflict.types";

const emptyReport: ConflictReport = {
  eventOverlaps: [],
  scenesWithoutChapter: [],
  chaptersWithoutArc: [],
  deadCharactersInEvents: [],
};

export const ConflictCheck = () => {
  const { t } = useI18n();
  const { notify } = useToast();
  const [report, setReport] = useState<ConflictReport>(emptyReport);
  const [loading, setLoading] = useState(false);

  const loadReport = async () => {
    setLoading(true);
    try {
      const data = await getConflictReport();
      setReport(data ?? emptyReport);
    } catch (err) {
      notify((err as Error).message, "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadReport();
  }, []);

  return (
    <div>
      <div className="card">
        <div className="card__header">
          <div>
            <h3 className="section-title">{t("Conflicts")}</h3>
            <p className="header__subtitle">
              {t("System conflict report.")}
            </p>
          </div>
        </div>
        {loading && <p className="header__subtitle">{t("Loading...")}</p>}
      </div>

      <div className="card" style={{ marginTop: "20px" }}>
        <h3 className="section-title">{t("Event overlaps")}</h3>
        {report.eventOverlaps.length === 0 ? (
          <p className="header__subtitle">{t("No event overlaps.")}</p>
        ) : (
          <table className="table table--clean">
            <thead>
              <tr>
                <th>{t("Segment")}</th>
                <th>{t("Event A")}</th>
                <th>{t("Event B")}</th>
                <th>{t("Period")}</th>
              </tr>
            </thead>
            <tbody>
              {report.eventOverlaps.map((overlap, index) => (
                <tr key={`${overlap.eventA.id}-${overlap.eventB.id}-${index}`}>
                  <td>{overlap.timelineName ?? overlap.timelineId ?? "-"}</td>
                  <td>{overlap.eventA.name}</td>
                  <td>{overlap.eventB.name}</td>
                  <td>
                    {overlap.eventA.startYear} - {overlap.eventA.endYear} / {" "}
                    {overlap.eventB.startYear} - {overlap.eventB.endYear}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="card" style={{ marginTop: "20px" }}>
        <h3 className="section-title">{t("Scenes without chapter")}</h3>
        {report.scenesWithoutChapter.length === 0 ? (
          <p className="header__subtitle">{t("No orphan scenes.")}</p>
        ) : (
          <ul>
            {report.scenesWithoutChapter.map((scene) => (
              <li key={scene.id}>
                {scene.name} ({scene.id})
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="card" style={{ marginTop: "20px" }}>
        <h3 className="section-title">{t("Chapters without arc")}</h3>
        {report.chaptersWithoutArc.length === 0 ? (
          <p className="header__subtitle">{t("No orphan chapters.")}</p>
        ) : (
          <ul>
            {report.chaptersWithoutArc.map((chapter) => (
              <li key={chapter.id}>
                {chapter.name} ({chapter.id})
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="card" style={{ marginTop: "20px" }}>
        <h3 className="section-title">{t("Dead characters in events")}</h3>
        {report.deadCharactersInEvents.length === 0 ? (
          <p className="header__subtitle">{t("No dead character conflicts.")}</p>
        ) : (
          <table className="table table--clean">
            <thead>
              <tr>
                <th>{t("Character")}</th>
                <th>{t("Event")}</th>
              </tr>
            </thead>
            <tbody>
              {report.deadCharactersInEvents.map((conflict, index) => (
                <tr key={`${conflict.character.id}-${conflict.event.id}-${index}`}>
                  <td>{conflict.character.name}</td>
                  <td>{conflict.event.name}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
