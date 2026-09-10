/**
 * Templates Service
 *
 * Manages Meta-approved templates with variable replacement for 24-hour window.
 */

class TemplatesService {
  constructor() {
    this.templates = [];
    this.cacheExpiry = null;
  }

  /**
   * Load templates (from backend in production)
   */
  async loadTemplates() {
    try {
      // In production, fetch from backend: /api/templates
      // For now, return mock templates
      const mockTemplates = [
        {
          id: 'tpl_1',
          name: 'Confirmación de Compra',
          category: 'PURCHASE_UPDATE',
          language: 'es',
          status: 'APPROVED',
          components: [
            {
              type: 'BODY',
              text: 'Hola {{name}}, tu compra de {{amount}} ha sido confirmada. Número de orden: {{order_id}}.'
            }
          ],
          variables: ['name', 'amount', 'order_id']
        },
        {
          id: 'tpl_2',
          name: 'Envío en Tránsito',
          category: 'ORDER_STATUS',
          language: 'es',
          status: 'APPROVED',
          components: [
            {
              type: 'BODY',
              text: 'Tu pedido {{order_id}} está en camino. Tracking: {{tracking_url}}'
            }
          ],
          variables: ['order_id', 'tracking_url']
        },
        {
          id: 'tpl_3',
          name: 'Seguimiento de Ticket',
          category: 'TICKET_UPDATE',
          language: 'es',
          status: 'APPROVED',
          components: [
            {
              type: 'BODY',
              text: 'Ticket #{{ticket_id}} - Estado: {{status}}. Tiempo estimado de resolución: {{eta}}'
            }
          ],
          variables: ['ticket_id', 'status', 'eta']
        }
      ];

      this.templates = mockTemplates;
      this.cacheExpiry = Date.now() + 3600000; // 1 hour cache
      return mockTemplates;
    } catch (err) {
      console.error('Error loading templates:', err);
      return [];
    }
  }

  /**
   * Get all templates
   */
  getTemplates() {
    return this.templates;
  }

  /**
   * Get templates for platform
   */
  getTemplatesByPlatform(platform) {
    // Templates apply across platforms in Meta ecosystem
    return this.templates;
  }

  /**
   * Replace template variables with values
   */
  replaceVariables(template, values = {}) {
    let text = template.components[0]?.text || '';

    for (const variable of template.variables) {
      const regex = new RegExp(`{{${variable}}}`, 'g');
      text = text.replace(regex, values[variable] || '');
    }

    return text;
  }

  /**
   * Send template message (requires backend integration)
   */
  async sendTemplate(conversationId, templateId, variables = {}) {
    try {
      const template = this.templates.find(t => t.id === templateId);
      if (!template) {
        return { success: false, error: 'Plantilla no encontrada' };
      }

      const message = this.replaceVariables(template, variables);
      // In production, send via backend: POST /api/conversations/{id}/messages with template metadata
      return { success: true, message, templateId };
    } catch (err) {
      console.error('Error sending template:', err);
      return { success: false, error: err.message };
    }
  }

  /**
   * Check if outside 24-hour window (when templates are required)
   */
  isOutside24HourWindow(conversationId) {
    // In production, check conversation's last_message_time
    // If > 24 hours, templates are required
    return true; // Placeholder
  }

  /**
   * Validate template variables
   */
  validateVariables(template, values) {
    const missing = [];

    for (const variable of template.variables) {
      if (!values[variable]) {
        missing.push(variable);
      }
    }

    return {
      valid: missing.length === 0,
      missing
    };
  }
}

export const templatesService = new TemplatesService();
export default templatesService;
