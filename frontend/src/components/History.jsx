import React, { useState, useEffect, useCallback } from 'react';
import { getHistory, deleteHistory } from '../api/client.js';

const PAGE_LIMIT = 20;

/**
 * History component
 *
 * Displays paginated calculation history fetched from GET /api/history.
 * Supports deleting individual entries via DELETE /api/history/:id.
 *
 * @param {{ refreshTrigger: number }} props
 *   refreshTrigger increments each time a new calculation is completed,
 *   causing this component to re-fetch.
 */
export default function History({ refreshTrigger }) {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyError, setHistoryError] = useState(null);
  const [deletingIds, setDeletingIds] = useState(new Set());
  const [deleteErrors, setDeleteErrors] = useState({});

  const totalPages = Math.max(1, Math.ceil(total / PAGE_LIMIT));

  const fetchHistory = useCallback(async (targetPage) => {
    setLoadingHistory(true);
    setHistoryError(null);
    try {
      const data = await getHistory(targetPage, PAGE_LIMIT);
      setItems(data.items);
      setTotal(data.total);
    } catch (err) {
      console.error('Failed to fetch history:', err);
      setHistoryError('Failed to load history');
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  // Fetch whenever page changes or a new calculation is completed
  useEffect(() => {
    fetchHistory(page);
  }, [page, refreshTrigger, fetchHistory]);

  const handleDelete = useCallback(
    async (id) => {
      setDeletingIds((prev) => new Set(prev).add(id));
      setDeleteErrors((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      try {
        await deleteHistory(id);
        // Re-fetch current page; if it becomes empty and not page 1, go back
        const newTotal = total - 1;
        const newTotalPages = Math.max(1, Math.ceil(newTotal / PAGE_LIMIT));
        const targetPage = page > newTotalPages ? newTotalPages : page;
        setPage(targetPage);
        if (targetPage === page) {
          await fetchHistory(targetPage);
        }
      } catch (err) {
        console.error('Failed to delete history item:', err);
        setDeleteErrors((prev) => ({
          ...prev,
          [id]: 'Delete failed. Try again.',
        }));
      } finally {
        setDeletingIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }
    },
    [total, page, fetchHistory]
  );

  const handlePrevPage = useCallback(() => {
    setPage((p) => Math.max(1, p - 1));
  }, []);

  const handleNextPage = useCallback(() => {
    setPage((p) => Math.min(totalPages, p + 1));
  }, [totalPages]);

  return (
    <section className="history-panel" aria-label="Calculation history">
      <h2 className="history-title">History</h2>

      {loadingHistory && (
        <p className="history-loading" aria-live="polite">
          Loading...
        </p>
      )}

      {historyError && (
        <p className="history-error" role="alert" aria-live="assertive">
          {historyError}
        </p>
      )}

      {!loadingHistory && !historyError && items.length === 0 && (
        <p className="history-empty">No calculations yet.</p>
      )}

      {items.length > 0 && (
        <ul className="history-list" aria-label="Past calculations">
          {items.map((item) => (
            <li key={item.id} className="history-item">
              <span className="history-expression">
                {item.expression} = <strong>{item.result}</strong>
              </span>
              <div className="history-item-actions">
                {deleteErrors[item.id] && (
                  <span className="history-delete-error" role="alert">
                    {deleteErrors[item.id]}
                  </span>
                )}
                <button
                  className="btn btn-delete"
                  onClick={() => handleDelete(item.id)}
                  disabled={deletingIds.has(item.id)}
                  aria-label="delete calculation"
                >
                  {deletingIds.has(item.id) ? '...' : '✕'}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {total > PAGE_LIMIT && (
        <div className="history-pagination" role="navigation" aria-label="History pagination">
          <button
            className="btn btn-page"
            onClick={handlePrevPage}
            disabled={page <= 1}
            aria-label="previous page"
          >
            Previous
          </button>
          <span className="history-page-info" aria-live="polite">
            Page {page} of {totalPages}
          </span>
          <button
            className="btn btn-page"
            onClick={handleNextPage}
            disabled={page >= totalPages}
            aria-label="next page"
          >
            Next
          </button>
        </div>
      )}
    </section>
  );
}
