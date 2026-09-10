import React from 'react';

export function SearchResults({ results, isOpen, onClose, onSelectMessage }) {
  if (!isOpen || results.length === 0) return null;

  // Group results by conversation
  const grouped = {};
  results.forEach(result => {
    const convId = result.conversationId;
    if (!grouped[convId]) {
      grouped[convId] = {
        conversationId: convId,
        conversationName: result.conversationName,
        messages: []
      };
    }
    grouped[convId].messages.push(result);
  });

  return (
    <div className="search-results-modal">
      <div className="search-results-header">
        <h3>Resultados de Búsqueda ({results.length})</h3>
        <button className="close-btn" onClick={onClose}>✕</button>
      </div>

      <div className="search-results-list">
        {Object.values(grouped).map(group => (
          <div key={group.conversationId} className="results-group">
            <div className="group-header">{group.conversationName}</div>
            {group.messages.map((msg, idx) => (
              <div
                key={idx}
                className="result-item"
                onClick={() => {
                  onSelectMessage(group.conversationId, msg.messageId);
                  onClose();
                }}
              >
                <div className="result-context">{msg.context}</div>
                <div className="result-meta">
                  {new Date(msg.timestamp).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>

      <style>{`
        .search-results-modal {
          position: fixed;
          top: 60px;
          right: 20px;
          width: 350px;
          max-height: 500px;
          background: var(--bg-surface);
          border: 1px solid var(--border-light);
          border-radius: 8px;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
          z-index: 999;
          display: flex;
          flex-direction: column;
        }

        .search-results-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 16px;
          border-bottom: 1px solid var(--border-light);
        }

        .search-results-header h3 {
          margin: 0;
          font-size: 14px;
        }

        .close-btn {
          background: none;
          border: none;
          cursor: pointer;
          font-size: 16px;
          color: var(--text-soft);
        }

        .search-results-list {
          overflow-y: auto;
          flex: 1;
        }

        .results-group {
          border-bottom: 1px solid var(--border-light);
        }

        .group-header {
          padding: 8px 16px;
          background: var(--bg-surface-2);
          font-size: 12px;
          font-weight: 600;
          color: var(--text-soft);
        }

        .result-item {
          padding: 12px 16px;
          cursor: pointer;
          border-bottom: 1px solid rgba(0, 0, 0, 0.05);
          transition: background 0.2s;
        }

        .result-item:hover {
          background: var(--bg-surface-2);
        }

        .result-context {
          font-size: 13px;
          line-height: 1.4;
          color: var(--text);
          margin-bottom: 4px;
        }

        .result-meta {
          font-size: 11px;
          color: var(--text-soft);
        }
      `}</style>
    </div>
  );
}

export default SearchResults;
