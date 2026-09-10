import React, { useState } from 'react';
import { reportsService } from '../services/reports.service';

export function ReportBuilder({ onClose }) {
  const [reportType, setReportType] = useState('sales');
  const [dateRange, setDateRange] = useState('30days');
  const [selectedMetrics, setSelectedMetrics] = useState(['totalSales', 'totalTransactions']);
  const [exportFormat, setExportFormat] = useState('pdf');

  const reportTypes = [
    { id: 'sales', label: 'Sales Report', icon: '💰' },
    { id: 'conversations', label: 'Conversations Report', icon: '💬' },
    { id: 'performance', label: 'Performance Report', icon: '📊' },
    { id: 'custom', label: 'Custom Report', icon: '⚙️' }
  ];

  const dateRanges = [
    { id: '7days', label: 'Last 7 Days' },
    { id: '30days', label: 'Last 30 Days' },
    { id: '90days', label: 'Last 90 Days' },
    { id: 'custom', label: 'Custom Range' }
  ];

  const metrics = [
    { id: 'totalSales', label: 'Total Sales' },
    { id: 'totalTransactions', label: 'Total Transactions' },
    { id: 'averageOrderValue', label: 'Average Order Value' },
    { id: 'conversionRate', label: 'Conversion Rate' },
    { id: 'customerCount', label: 'Customer Count' }
  ];

  const handleToggleMetric = (metricId) => {
    setSelectedMetrics(prev =>
      prev.includes(metricId)
        ? prev.filter(m => m !== metricId)
        : [...prev, metricId]
    );
  };

  const handleGenerateReport = () => {
    const report = reportsService.generateReport({
      type: reportType,
      dateRange,
      metrics: selectedMetrics,
      template: 'standard'
    });
    console.log('Report generated:', report);
  };

  const handleExportReport = () => {
    const report = reportsService.generateReport({
      type: reportType,
      dateRange,
      metrics: selectedMetrics
    });
    reportsService.exportReport(report, exportFormat);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content report-builder-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Report Builder</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          {/* Report Type Selection */}
          <div className="section">
            <h3>Report Type</h3>
            <div className="report-type-grid">
              {reportTypes.map(type => (
                <button
                  key={type.id}
                  className={`report-type-card ${reportType === type.id ? 'active' : ''}`}
                  onClick={() => setReportType(type.id)}
                >
                  <span className="icon">{type.icon}</span>
                  <span>{type.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Date Range Selection */}
          <div className="section">
            <h3>Date Range</h3>
            <div className="date-range-options">
              {dateRanges.map(range => (
                <label key={range.id} className="radio-option">
                  <input
                    type="radio"
                    name="dateRange"
                    value={range.id}
                    checked={dateRange === range.id}
                    onChange={(e) => setDateRange(e.target.value)}
                  />
                  <span>{range.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Metrics Selection */}
          <div className="section">
            <h3>Metrics to Include</h3>
            <div className="metrics-list">
              {metrics.map(metric => (
                <label key={metric.id} className="checkbox-option">
                  <input
                    type="checkbox"
                    checked={selectedMetrics.includes(metric.id)}
                    onChange={() => handleToggleMetric(metric.id)}
                  />
                  <span>{metric.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Export Format */}
          <div className="section">
            <h3>Export Format</h3>
            <div className="export-format-options">
              <label className="radio-option">
                <input
                  type="radio"
                  name="format"
                  value="pdf"
                  checked={exportFormat === 'pdf'}
                  onChange={(e) => setExportFormat(e.target.value)}
                />
                <span>PDF</span>
              </label>
              <label className="radio-option">
                <input
                  type="radio"
                  name="format"
                  value="excel"
                  checked={exportFormat === 'excel'}
                  onChange={(e) => setExportFormat(e.target.value)}
                />
                <span>Excel (XLSX)</span>
              </label>
              <label className="radio-option">
                <input
                  type="radio"
                  name="format"
                  value="csv"
                  checked={exportFormat === 'csv'}
                  onChange={(e) => setExportFormat(e.target.value)}
                />
                <span>CSV</span>
              </label>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button onClick={onClose} className="secondary-btn">Cancel</button>
          <button onClick={handleGenerateReport} className="primary-btn">Generate Report</button>
          <button onClick={handleExportReport} className="primary-btn">Generate & Export</button>
        </div>
      </div>
    </div>
  );
}

export default ReportBuilder;
