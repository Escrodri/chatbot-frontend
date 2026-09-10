/**
 * Sales Service
 *
 * Aggregates sales data with caching and formatting.
 */

class SalesService {
  constructor() {
    this.cache = null;
    this.cacheExpiry = null;
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Get sales data (with caching)
   */
  async getSalesData(startDate, endDate) {
    const now = Date.now();
    if (this.cache && this.cacheExpiry && now < this.cacheExpiry) {
      return this.cache;
    }

    try {
      // In production, fetch from backend
      const data = {
        summary: {
          totalSales: 125000,
          totalTransactions: 48,
          averageOrderValue: 2604.17,
          conversionRate: 12.5
        },
        byPlatform: {
          whatsapp: { sales: 75000, transactions: 30, percentage: 60 },
          instagram: { sales: 35000, transactions: 12, percentage: 28 },
          facebook: { sales: 15000, transactions: 6, percentage: 12 }
        },
        topConversations: [
          { id: 'conv_1', name: 'Juan García', sales: 18000, transactions: 6 },
          { id: 'conv_2', name: 'María López', sales: 15000, transactions: 5 },
          { id: 'conv_3', name: 'Carlos Rodríguez', sales: 12000, transactions: 4 }
        ],
        dailyTrend: [
          { date: '2024-01-01', sales: 4500, transactions: 2 },
          { date: '2024-01-02', sales: 6200, transactions: 3 },
          { date: '2024-01-03', sales: 5800, transactions: 2 },
          { date: '2024-01-04', sales: 7300, transactions: 3 },
          { date: '2024-01-05', sales: 6100, transactions: 2 }
        ]
      };

      this.cache = data;
      this.cacheExpiry = now + this.cacheTimeout;
      return data;
    } catch (err) {
      console.error('Error fetching sales data:', err);
      return null;
    }
  }

  /**
   * Format currency
   */
  formatCurrency(amount, currency = 'PYG') {
    const symbols = {
      'PYG': '₲',
      'USD': '$',
      'ARS': '$',
      'BRL': 'R$'
    };

    const symbol = symbols[currency] || currency;

    if (currency === 'PYG') {
      return `${symbol} ${amount.toLocaleString('es-ES')}`;
    }
    return `${symbol} ${amount.toLocaleString('es-ES', { minimumFractionDigits: 2 })}`;
  }

  /**
   * Get sales metrics
   */
  async getMetrics(days = 30) {
    const data = await this.getSalesData(null, null);
    if (!data) return null;

    return {
      ...data.summary,
      currency: 'PYG',
      period: days,
      trend: this._calculateTrend(data.dailyTrend)
    };
  }

  /**
   * Calculate trend (up/down)
   */
  _calculateTrend(dailyData) {
    if (dailyData.length < 2) return 0;

    const recent = dailyData.slice(-7);
    const previous = dailyData.slice(-14, -7);

    const recentSum = recent.reduce((sum, d) => sum + d.sales, 0);
    const previousSum = previous.reduce((sum, d) => sum + d.sales, 0);

    if (previousSum === 0) return 0;
    return ((recentSum - previousSum) / previousSum) * 100;
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache = null;
    this.cacheExpiry = null;
  }
}

export const salesService = new SalesService();
export default salesService;
