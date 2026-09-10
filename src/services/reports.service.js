/**
 * Reports Service
 *
 * Generates, exports and manages custom reports with multiple formats.
 */

class ReportsService {
  constructor() {
    this.reports = [];
    this.loadReports();
  }

  /**
   * Load reports from localStorage
   */
  loadReports() {
    try {
      const stored = localStorage.getItem('reports');
      this.reports = stored ? JSON.parse(stored) : [];
    } catch (err) {
      console.error('Error loading reports:', err);
      this.reports = [];
    }
  }

  /**
   * Generate report
   */
  generateReport(config) {
    const report = {
      id: `report_${Date.now()}`,
      type: config.type,
      dateRange: config.dateRange,
      metrics: config.metrics,
      template: config.template || 'standard',
      createdAt: new Date().toISOString(),
      data: this._collectReportData(config)
    };

    this.reports.push(report);
    this._persistReports();
    return report;
  }

  /**
   * Collect report data based on configuration
   */
  _collectReportData(config) {
    const baseData = {
      summary: {
        totalSales: 125000,
        totalTransactions: 48,
        averageOrderValue: 2604.17,
        conversionRate: 12.5,
        customerCount: 35
      },
      dateRange: config.dateRange,
      generatedAt: new Date().toISOString()
    };

    if (config.metrics) {
      const filteredSummary = {};
      config.metrics.forEach(metric => {
        if (baseData.summary[metric]) {
          filteredSummary[metric] = baseData.summary[metric];
        }
      });
      return { ...baseData, summary: filteredSummary };
    }

    return baseData;
  }

  /**
   * Export report to various formats
   */
  exportReport(report, format) {
    let content = '';
    let filename = `report_${report.type}_${new Date().toISOString().split('T')[0]}`;

    switch (format) {
      case 'pdf':
        content = this._generatePDF(report);
        filename += '.pdf';
        break;
      case 'excel':
        content = this._generateExcel(report);
        filename += '.xlsx';
        break;
      case 'csv':
        content = this._generateCSV(report);
        filename += '.csv';
        break;
      default:
        return;
    }

    this._downloadFile(content, filename, format);
  }

  /**
   * Generate PDF content (placeholder)
   */
  _generatePDF(report) {
    // In production, use a library like jsPDF
    return JSON.stringify(report, null, 2);
  }

  /**
   * Generate Excel content (placeholder)
   */
  _generateExcel(report) {
    // In production, use a library like ExcelJS
    return JSON.stringify(report, null, 2);
  }

  /**
   * Generate CSV content
   */
  _generateCSV(report) {
    const lines = [
      `Report Type,${report.type}`,
      `Date Range,${report.dateRange}`,
      `Generated At,${report.generatedAt}`,
      '',
      'Metric,Value'
    ];

    Object.entries(report.data.summary).forEach(([key, value]) => {
      lines.push(`${key},${value}`);
    });

    return lines.join('\n');
  }

  /**
   * Download file
   */
  _downloadFile(content, filename, format) {
    const blob = new Blob([content], {
      type: format === 'csv' ? 'text/csv' : 'application/json'
    });

    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
  }

  /**
   * Get all reports
   */
  getReports() {
    return this.reports;
  }

  /**
   * Get report by ID
   */
  getReportById(reportId) {
    return this.reports.find(r => r.id === reportId);
  }

  /**
   * Delete report
   */
  deleteReport(reportId) {
    this.reports = this.reports.filter(r => r.id !== reportId);
    this._persistReports();
  }

  /**
   * Get report templates
   */
  getReportTemplates() {
    return [
      { id: 'standard', label: 'Standard Report', icon: '📊' },
      { id: 'summary', label: 'Summary Report', icon: '📋' },
      { id: 'detailed', label: 'Detailed Report', icon: '📑' },
      { id: 'executive', label: 'Executive Summary', icon: '👔' }
    ];
  }

  /**
   * Persist reports to localStorage
   */
  _persistReports() {
    localStorage.setItem('reports', JSON.stringify(this.reports));
  }
}

export const reportsService = new ReportsService();
export default reportsService;
