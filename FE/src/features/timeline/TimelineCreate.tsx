import { useState } from "react";
import { Button } from "../../components/common/Button";
import { useToast } from "../../components/common/Toast";
import { useI18n } from "../../i18n/I18nProvider";
import {
  LegacyTimelineMigrationResult,
  migrateLegacyTimelines,
} from "./timeline.api";
import { TimelineStructurePanel } from "./TimelineStructurePanel";

export const TimelineCreate = () => {
  const { t } = useI18n();
  const { notify } = useToast();
  const [isMigrating, setIsMigrating] = useState(false);
  const [result, setResult] = useState<LegacyTimelineMigrationResult | null>(null);

  const handleMigrate = async () => {
    const confirmed = window.confirm(
      t(
        "Migrate legacy timelines into timeline-first structure and remove legacy timeline nodes?"
      )
    );
    if (!confirmed) {
      return;
    }

    setIsMigrating(true);
    try {
      const migrated = await migrateLegacyTimelines({ deleteLegacy: true });
      setResult(migrated);
      notify(t("Legacy timeline migration completed."), "success");
    } catch (err) {
      notify((err as Error).message, "error");
    } finally {
      setIsMigrating(false);
    }
  };

  return (
    <div className="timeline-page">
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card__header">
          <div>
            <h3 className="section-title">{t("Timeline-first management")}</h3>
            <p className="header__subtitle">
              {t(
                "Use axis/era/segment/marker as the single timeline model. Legacy timeline UI has been removed to avoid duplicate workflows."
              )}
            </p>
          </div>
          <Button onClick={handleMigrate} disabled={isMigrating}>
            {isMigrating
              ? t("Migrating...")
              : t("Migrate legacy timelines and clean up")}
          </Button>
        </div>

        {result ? (
          <div className="detail-grid" style={{ marginTop: 12 }}>
            <div className="detail-item detail-item--narrow">
              <span className="detail-item__label">{t("Legacy timelines")}</span>
              <div className="detail-item__value">{result.timelinesFound}</div>
            </div>
            <div className="detail-item detail-item--narrow">
              <span className="detail-item__label">{t("Segments created")}</span>
              <div className="detail-item__value">{result.segmentsCreated}</div>
            </div>
            <div className="detail-item detail-item--narrow">
              <span className="detail-item__label">{t("Markers created")}</span>
              <div className="detail-item__value">{result.markersCreated}</div>
            </div>
            <div className="detail-item detail-item--narrow">
              <span className="detail-item__label">{t("Legacy links unresolved")}</span>
              <div className="detail-item__value">{result.unresolvedLegacyEventLinks}</div>
            </div>
            <div className="detail-item detail-item--wide">
              <span className="detail-item__label">{t("Legacy cleanup")}</span>
              <div className="detail-item__value">
                {result.deletedLegacyTimelineNodes
                  ? t("Legacy timelines removed safely.")
                  : t(
                      "Legacy timelines were kept because some event links could not be resolved."
                    )}
              </div>
            </div>
          </div>
        ) : null}
      </div>

      <TimelineStructurePanel open />
    </div>
  );
};
