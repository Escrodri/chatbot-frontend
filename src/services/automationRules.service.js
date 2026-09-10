/**
 * Automation Rules Service
 *
 * Creates and manages automation rules with triggers and actions.
 */

class AutomationRulesService {
  constructor() {
    this.rules = [];
    this.loadRules();
  }

  /**
   * Load rules from localStorage
   */
  loadRules() {
    try {
      const stored = localStorage.getItem('automation_rules');
      this.rules = stored ? JSON.parse(stored) : [];
    } catch (err) {
      console.error('Error loading automation rules:', err);
      this.rules = [];
    }
  }

  /**
   * Create new rule
   */
  createRule(rule) {
    const newRule = {
      id: `rule_${Date.now()}`,
      ...rule,
      enabled: true,
      createdAt: new Date().toISOString(),
      executionCount: 0,
      lastExecuted: null
    };

    this.rules.push(newRule);
    this._persistRules();
    return newRule;
  }

  /**
   * Get all rules
   */
  getRules() {
    return this.rules;
  }

  /**
   * Get enabled rules
   */
  getEnabledRules() {
    return this.rules.filter(r => r.enabled);
  }

  /**
   * Update rule
   */
  updateRule(ruleId, updates) {
    const index = this.rules.findIndex(r => r.id === ruleId);
    if (index !== -1) {
      this.rules[index] = { ...this.rules[index], ...updates };
      this._persistRules();
      return this.rules[index];
    }
    return null;
  }

  /**
   * Delete rule
   */
  deleteRule(ruleId) {
    this.rules = this.rules.filter(r => r.id !== ruleId);
    this._persistRules();
  }

  /**
   * Evaluate if message matches rule trigger
   */
  matchesTrigger(message, trigger) {
    const text = message.text?.toLowerCase() || '';

    switch (trigger.type) {
      case 'keyword':
        return text.includes(trigger.value?.toLowerCase());
      case 'regex':
        try {
          const regex = new RegExp(trigger.value, 'i');
          return regex.test(text);
        } catch {
          return false;
        }
      case 'exact_match':
        return text === trigger.value?.toLowerCase();
      case 'starts_with':
        return text.startsWith(trigger.value?.toLowerCase());
      default:
        return false;
    }
  }

  /**
   * Execute rule actions
   */
  executeRuleActions(rule, conversationId, messageData) {
    const results = [];

    for (const action of rule.actions) {
      const result = this._executeAction(action, conversationId, messageData);
      results.push(result);
    }

    // Update execution count
    const index = this.rules.findIndex(r => r.id === rule.id);
    if (index !== -1) {
      this.rules[index].executionCount += 1;
      this.rules[index].lastExecuted = new Date().toISOString();
      this._persistRules();
    }

    return results;
  }

  /**
   * Execute single action
   */
  _executeAction(action, conversationId, messageData) {
    switch (action.type) {
      case 'send_response':
        return {
          type: 'send_response',
          message: action.message,
          conversationId
        };
      case 'add_tag':
        return {
          type: 'add_tag',
          tag: action.tag,
          conversationId
        };
      case 'assign_user':
        return {
          type: 'assign_user',
          userId: action.userId,
          conversationId
        };
      case 'webhook':
        return {
          type: 'webhook',
          url: action.webhookUrl,
          conversationId,
          messageData
        };
      default:
        return null;
    }
  }

  /**
   * Get trigger templates
   */
  getTriggerTemplates() {
    return [
      { type: 'keyword', label: 'Contiene palabra clave', icon: '🔤' },
      { type: 'exact_match', label: 'Coincidencia exacta', icon: '✓' },
      { type: 'starts_with', label: 'Comienza con', icon: '→' },
      { type: 'regex', label: 'Expresión regular', icon: '.*' }
    ];
  }

  /**
   * Get action templates
   */
  getActionTemplates() {
    return [
      { type: 'send_response', label: 'Enviar respuesta', icon: '💬' },
      { type: 'add_tag', label: 'Agregar etiqueta', icon: '🏷️' },
      { type: 'assign_user', label: 'Asignar usuario', icon: '👤' },
      { type: 'webhook', label: 'Webhook', icon: '🔗' }
    ];
  }

  /**
   * Persist rules to localStorage
   */
  _persistRules() {
    localStorage.setItem('automation_rules', JSON.stringify(this.rules));
  }
}

export const automationRulesService = new AutomationRulesService();
export default automationRulesService;
