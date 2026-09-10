import React from 'react';

export function MobileNav({ activeTab, onChangeTab, unreadCount }) {
  return (
    <div className="mobile-nav">
      <button
        className={`nav-tab ${activeTab === 'conversations' ? 'active' : ''}`}
        onClick={() => onChangeTab('conversations')}
      >
        <span className="nav-icon">💬</span>
        <span className="nav-label">Conversaciones</span>
        {unreadCount > 0 && <span className="nav-badge">{unreadCount}</span>}
      </button>
      <button
        className={`nav-tab ${activeTab === 'chat' ? 'active' : ''}`}
        onClick={() => onChangeTab('chat')}
      >
        <span className="nav-icon">💭</span>
        <span className="nav-label">Chat</span>
      </button>
    </div>
  );
}

const styles = `
  .mobile-nav {
    display: none;
    gap: 0;
    border-top: 1px solid var(--border-light);
    background: var(--bg-surface);
  }

  @media (max-width: 768px) {
    .mobile-nav {
      display: flex;
    }
  }

  .nav-tab {
    flex: 1;
    padding: 12px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    background: none;
    border: none;
    cursor: pointer;
    color: var(--text-soft);
    position: relative;
  }

  .nav-tab.active {
    color: var(--accent);
    border-top: 2px solid var(--accent);
  }

  .nav-icon {
    font-size: 20px;
  }

  .nav-label {
    font-size: 11px;
    font-weight: 500;
  }

  .nav-badge {
    position: absolute;
    top: 0;
    right: 0;
    width: 18px;
    height: 18px;
    background: #d32f2f;
    color: white;
    border-radius: 50%;
    font-size: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 600;
  }
`;

export const mobileNavStyles = styles;
