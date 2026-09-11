/**
 * CV Form Service
 * Maneja los formularios de CV (Clásico vs Harvard)
 */

export const cvFormService = {
  // Tipos de CV disponibles
  TYPES: {
    CLASSIC: 'classic',
    HARVARD: 'harvard'
  },

  // Estructura de campos por tipo de CV
  FIELDS: {
    classic: [
      { id: 'fullName', label: 'Nombres y apellidos', type: 'text', required: true },
      { id: 'address', label: 'Dirección: barrio y ciudad', type: 'text', required: true },
      { id: 'phone', label: 'Número de teléfono', type: 'tel', required: true },
      { id: 'email', label: 'Correo', type: 'email', required: true },
      { id: 'description', label: 'Descripción profesional', type: 'textarea', required: false },
      { id: 'highSchool', label: 'Nombre del colegio donde se culminaron los estudios + tipo de bachiller', type: 'text', required: false },
      { id: 'university', label: 'Universidad: nombre, carrera y estado actual (ej: "en curso" - indicar año o "culminado")', type: 'text', required: false },
      { id: 'languages', label: 'Idiomas (separados por coma)', type: 'text', required: false },
      { id: 'skills', label: 'Habilidades (separadas por coma)', type: 'textarea', required: false },
      { id: 'experience', label: 'Experiencia laboral: Nombre de la empresa, cargo ocupado y antigüedad (ej: "Empresa X - Vendedor - marzo 2024 - junio 2025")', type: 'textarea', required: false },
      { id: 'references', label: 'Referencias laborales (Nombre, apellido, empresa y n° de teléfono)', type: 'textarea', required: false }
    ],
    harvard: [
      { id: 'fullName', label: 'Nombres y apellidos', type: 'text', required: true },
      { id: 'birthDate', label: 'Fecha de nacimiento', type: 'date', required: true },
      { id: 'cedula', label: 'Número de cédula', type: 'text', required: true },
      { id: 'address', label: 'Dirección: barrio y ciudad', type: 'text', required: true },
      { id: 'phone', label: 'Número de teléfono', type: 'tel', required: true },
      { id: 'email', label: 'Correo', type: 'email', required: true },
      { id: 'highSchool', label: 'Nombre del colegio donde se culminaron los estudios + tipo de bachillerato', type: 'text', required: false },
      { id: 'university', label: 'Universidad: nombre y carrera', type: 'text', required: false },
      { id: 'languages', label: 'Idiomas (separados por coma)', type: 'text', required: false },
      { id: 'experience', label: 'Experiencia laboral: Nombre de la empresa, cargo ocupado y antigüedad', type: 'textarea', required: false },
      { id: 'references', label: 'Referencias laborales y personales (Nombre, apellido y n° de teléfono)', type: 'textarea', required: false }
    ]
  },

  // Obtener campos por tipo de CV
  getFields(cvType) {
    return this.FIELDS[cvType] || this.FIELDS.classic;
  },

  // Validar que los campos requeridos estén completos
  validateForm(data, cvType) {
    const fields = this.getFields(cvType);
    const requiredFields = fields.filter(f => f.required);

    const errors = requiredFields.filter(field => !data[field.id] || data[field.id].toString().trim() === '');

    return {
      isValid: errors.length === 0,
      errors: errors.map(f => f.label)
    };
  },

  // Generar mensaje de confirmación con los datos ingresados
  generateConfirmationMessage(data, cvType) {
    const cvLabel = cvType === 'classic' ? 'CV Clásico' : 'CV Harvard a prueba de ATS';

    let message = `✅ *Datos recibidos para ${cvLabel}*\n\n`;

    if (data.fullName) message += `👤 *Nombre*: ${data.fullName}\n`;
    if (data.birthDate) message += `📅 *Fecha de nacimiento*: ${data.birthDate}\n`;
    if (data.cedula) message += `🆔 *Cédula*: ${data.cedula}\n`;
    if (data.address) message += `📍 *Dirección*: ${data.address}\n`;
    if (data.phone) message += `📱 *Teléfono*: ${data.phone}\n`;
    if (data.email) message += `📧 *Email*: ${data.email}\n`;

    message += `\n⏳ Tu CV estará listo en menos de 2 horas.\n`;
    message += `💬 Te contactaremos si necesitamos aclarar algo.\n`;
    message += `✨ Gracias por confiar en nosotros.`;

    return message;
  },

  // Detectar si es un usuario nuevo (no tiene historial de mensajes)
  isNewUser(messages) {
    return !messages || messages.length === 0;
  },

  // Mensaje de bienvenida automático
  getWelcomeMessage() {
    return `👋 *¡Hola! Bienvenido a pediloaquí*\n\n` +
           `Te ayudaremos a crear tu CV en menos de 2 horas.\n\n` +
           `¿Qué tipo de CV necesitas?\n\n` +
           `1️⃣ *CV Clásico* - Gs. 35.000\n` +
           `   (Para supermercados, tiendas, seguridad, transporte)\n\n` +
           `2️⃣ *CV Harvard a prueba de ATS* - Gs. 50.000\n` +
           `   (Para empresas que usan sistemas de selección)\n\n` +
           `Responde con *1* o *2* para continuar.`;
  }
};

export default cvFormService;
