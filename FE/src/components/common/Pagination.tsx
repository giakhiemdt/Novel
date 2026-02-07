import { Button } from "./Button";
import { useI18n } from "../../i18n/I18nProvider";

export type PaginationProps = {
  page: number;
  pageSize: number;
  itemCount: number;
  hasNext: boolean;
  totalCount?: number;
  pageSizeOptions?: number[];
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
};

export const Pagination = ({
  page,
  pageSize,
  itemCount,
  hasNext,
  totalCount,
  pageSizeOptions = [10, 20, 50],
  onPageChange,
  onPageSizeChange,
}: PaginationProps) => {
  const { t } = useI18n();
  const start = itemCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = itemCount === 0 ? 0 : (page - 1) * pageSize + itemCount;
  const total = typeof totalCount === "number" ? totalCount : undefined;
  const totalPages =
    total !== undefined ? Math.max(1, Math.ceil(total / pageSize)) : undefined;

  return (
    <div className="pagination">
      <div className="pagination__summary">
        {total !== undefined
          ? `${t("Showing")} ${start}-${end} / ${total}`
          : `${t("Showing")} ${start}-${end}`}
      </div>
      <div className="pagination__controls">
        <span className="pagination__label">{t("Rows per page")}</span>
        <select
          className="select pagination__select"
          value={String(pageSize)}
          onChange={(event) => onPageSizeChange(Number(event.target.value))}
          aria-label={t("Rows per page")}
        >
          {pageSizeOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        <div className="pagination__buttons">
          <Button
            type="button"
            variant="ghost"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
          >
            {t("Previous")}
          </Button>
          <span className="pagination__page">
            {totalPages !== undefined
              ? `${t("Page")} ${page} / ${totalPages}`
              : `${t("Page")} ${page}`}
          </span>
          <Button
            type="button"
            variant="ghost"
            disabled={!hasNext}
            onClick={() => onPageChange(page + 1)}
          >
            {t("Next")}
          </Button>
        </div>
      </div>
    </div>
  );
};
