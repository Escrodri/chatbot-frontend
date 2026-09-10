/**
 * Message Search Service
 *
 * Full-text search with context extraction and term highlighting.
 */

class MessageSearchService {
  constructor() {
    this.searchIndex = {};
  }

  /**
   * Index messages for search
   */
  indexMessages(conversations) {
    this.searchIndex = {};

    for (const conv of conversations) {
      for (const msg of conv.messages || []) {
        const key = `${conv.id}_${msg.id}`;
        this.searchIndex[key] = {
          conversationId: conv.id,
          conversationName: conv.contact_name,
          conversationPlatform: conv.platform,
          messageId: msg.id,
          text: msg.text || '',
          timestamp: msg.created_at,
          sender: msg.direction // 'inbound' or 'outbound'
        };
      }
    }
  }

  /**
   * Search messages
   */
  search(query, limit = 50) {
    if (!query || query.trim().length < 2) {
      return [];
    }

    const q = query.toLowerCase();
    const results = [];

    for (const [key, item] of Object.entries(this.searchIndex)) {
      const matchScore = this._calculateMatchScore(item.text, q);
      if (matchScore > 0) {
        results.push({
          ...item,
          matchScore,
          context: this._extractContext(item.text, q)
        });
      }
    }

    // Sort by match score and timestamp
    results.sort((a, b) => {
      if (b.matchScore !== a.matchScore) {
        return b.matchScore - a.matchScore;
      }
      return new Date(b.timestamp) - new Date(a.timestamp);
    });

    return results.slice(0, limit);
  }

  /**
   * Calculate match score for relevance
   */
  _calculateMatchScore(text, query) {
    const lower = text.toLowerCase();
    let score = 0;

    // Exact phrase match
    if (lower.includes(query)) {
      score += 10;
    }

    // Word-by-word match
    const words = query.split(/\s+/);
    const matchedWords = words.filter(word => lower.includes(word)).length;
    score += matchedWords * 5;

    return score;
  }

  /**
   * Extract context around matched term
   */
  _extractContext(text, query, contextLength = 60) {
    const lower = text.toLowerCase();
    const index = lower.indexOf(query);

    if (index === -1) {
      return text.substring(0, contextLength) + (text.length > contextLength ? '...' : '');
    }

    const start = Math.max(0, index - contextLength);
    const end = Math.min(text.length, index + query.length + contextLength);

    let context = '';
    if (start > 0) context = '...';
    context += text.substring(start, end);
    if (end < text.length) context += '...';

    return context;
  }

  /**
   * Highlight search terms in text
   */
  highlightTerms(text, query) {
    const regex = new RegExp(`(${query})`, 'gi');
    return text.replace(regex, '<mark>$1</mark>');
  }

  /**
   * Group search results by conversation
   */
  groupByConversation(results) {
    const grouped = {};

    for (const result of results) {
      const convId = result.conversationId;
      if (!grouped[convId]) {
        grouped[convId] = {
          conversationId: convId,
          conversationName: result.conversationName,
          platform: result.conversationPlatform,
          messages: []
        };
      }
      grouped[convId].messages.push(result);
    }

    return Object.values(grouped);
  }

  /**
   * Clear search index
   */
  clearIndex() {
    this.searchIndex = {};
  }
}

export const messageSearchService = new MessageSearchService();
export default messageSearchService;
