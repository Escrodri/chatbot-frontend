import React from 'react';

export function ConversationTags({ conversationId, tags = [] }) {
  if (!tags || tags.length === 0) {
    return null;
  }

  return (
    <div className="conversation-tags">
      {tags.map(tag => (
        <span key={tag} className="tag-badge" title={tag}>
          {tag}
        </span>
      ))}
    </div>
  );
}

const styles = `
  .conversation-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    margin-top: 4px;
  }

  .tag-badge {
    display: inline-block;
    padding: 2px 6px;
    background: var(--accent);
    color: white;
    border-radius: 2px;
    font-size: 10px;
    font-weight: 600;
    max-width: 120px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
`;

export const tagStyles = styles;
