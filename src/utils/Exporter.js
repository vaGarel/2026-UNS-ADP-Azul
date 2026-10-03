/**
 * Utilidad para Exportación y Descarga de Archivos en el Navegador
 */
export class Exporter {
  static downloadFile(filename, content, mimeType = 'text/plain;charset=utf-8') {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  static downloadICS(filename, icsContent) {
    this.downloadFile(filename, icsContent, 'text/calendar;charset=utf-8');
  }

  static downloadJSON(filename, jsonData) {
    const content = typeof jsonData === 'string' ? jsonData : JSON.stringify(jsonData, null, 2);
    this.downloadFile(filename, content, 'application/json;charset=utf-8');
  }
}
