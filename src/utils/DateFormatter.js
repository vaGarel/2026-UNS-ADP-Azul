/**
 * Formateador de Fechas y Textos en Español
 */
export class DateFormatter {
  static formatDate(dateStr, includeWeekday = false) {
    if (!dateStr) return 'Fecha no definida';
    const date = new Date(dateStr + (dateStr.length === 10 ? 'T00:00:00' : ''));
    if (isNaN(date.getTime())) return dateStr;

    const options = {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    };
    if (includeWeekday) {
      options.weekday = 'short';
    }

    return new Intl.DateTimeFormat('es-ES', options).format(date);
  }

  static formatDateRange(startStr, endStr) {
    if (!startStr) return 'Por definir';
    if (!endStr || startStr === endStr) {
      return this.formatDate(startStr);
    }
    const startDate = new Date(startStr + 'T00:00:00');
    const endDate = new Date(endStr + 'T00:00:00');

    if (startDate.getMonth() === endDate.getMonth()) {
      return `${startDate.getDate()} - ${endDate.getDate()} de ${new Intl.DateTimeFormat('es-ES', { month: 'short', year: 'numeric' }).format(endDate)}`;
    }
    return `${this.formatDate(startStr)} al ${this.formatDate(endStr)}`;
  }

  static formatDateTime(isoString) {
    if (!isoString) return '-';
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return isoString;
    return new Intl.DateTimeFormat('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  }
}
