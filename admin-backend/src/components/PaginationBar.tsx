import type { Pagination } from "@/lib/types";

export function PaginationBar({ pagination, onPageChange }: { pagination: Pagination; onPageChange: (page: number) => void }) {
  if (pagination.total === 0) return null;

  const start = (pagination.page - 1) * pagination.pageSize + 1;
  const end = Math.min(pagination.page * pagination.pageSize, pagination.total);

  return (
    <div className="ug-pagination">
      <span className="ug-pagination-summary">
        {start}–{end} of {pagination.total}
      </span>
      <div style={{ display: "flex", gap: "0.4rem" }}>
        <button
          className="ug-btn ug-btn-secondary ug-btn-sm"
          onClick={() => onPageChange(pagination.page - 1)}
          disabled={pagination.page <= 1}
        >
          Previous
        </button>
        <button
          className="ug-btn ug-btn-secondary ug-btn-sm"
          onClick={() => onPageChange(pagination.page + 1)}
          disabled={pagination.page >= pagination.totalPages}
        >
          Next
        </button>
      </div>
    </div>
  );
}
