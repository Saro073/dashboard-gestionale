// ==================== ANALYTICS MODULE ====================
// Modulo per calcolo metriche e statistiche avanzate

const AnalyticsModule = {
  /**
   * Calcola revenue trend per periodo
   * @param {number} months - Numero di mesi da analizzare
   * @returns {object} - { labels, income, expenses }
   */
  getRevenueTrend(months = 12) {
    try {
      const transactions = AccountingModule.getAll();
      const now = new Date();
      const startDate = new Date(now.getFullYear(), now.getMonth() - months + 1, 1);
      
      // Inizializza struttura dati
      const monthsData = {};
      for (let i = 0; i < months; i++) {
        const date = new Date(now.getFullYear(), now.getMonth() - months + 1 + i, 1);
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        monthsData[key] = { income: 0, expenses: 0, label: this.formatMonthLabel(date) };
      }
      
      // Aggrega transazioni per mese
      transactions.forEach(t => {
        const tDate = new Date(t.date);
        if (tDate >= startDate) {
          const key = `${tDate.getFullYear()}-${String(tDate.getMonth() + 1).padStart(2, '0')}`;
          if (monthsData[key]) {
            const amount = parseFloat(t.amount) || 0;
            if (t.type === 'income') {
              monthsData[key].income += amount;
            } else {
              monthsData[key].expenses += amount;
            }
          }
        }
      });
      
      // Converti in arrays per Chart.js
      const labels = [];
      const income = [];
      const expenses = [];
      
      Object.keys(monthsData).sort().forEach(key => {
        labels.push(monthsData[key].label);
        income.push(monthsData[key].income);
        expenses.push(monthsData[key].expenses);
      });
      
      return { labels, income, expenses };
    } catch (error) {
      ErrorHandler.handle(error, 'AnalyticsModule.getRevenueTrend');
      return { labels: [], income: [], expenses: [] };
    }
  },

  /**
   * Calcola distribuzione spese per categoria
   * @param {number} months - Numero di mesi da analizzare
   * @returns {object} - { labels, data, colors }
   */
  getExpensesByCategory(months = 12) {
    try {
      const transactions = AccountingModule.getAll();
      const now = new Date();
      const startDate = new Date(now.getFullYear(), now.getMonth() - months + 1, 1);
      
      const categories = {};
      const categoryLabels = {
        cleaning: 'Pulizie',
        maintenance: 'Manutenzione',
        utilities: 'Utenze',
        commission: 'Commissioni',
        insurance: 'Assicurazione',
        tax: 'Tasse',
        supplies: 'Forniture',
        marketing: 'Marketing',
        other_expense: 'Altro'
      };
      
      const categoryColors = {
        cleaning: '#3b82f6',
        maintenance: '#ef4444',
        utilities: '#f59e0b',
        commission: '#10b981',
        insurance: '#8b5cf6',
        tax: '#ec4899',
        supplies: '#14b8a6',
        marketing: '#f97316',
        other_expense: '#6b7280'
      };
      
      // Aggrega spese per categoria
      transactions
        .filter(t => t.type === 'expense' && new Date(t.date) >= startDate)
        .forEach(t => {
          const amount = parseFloat(t.amount) || 0;
          categories[t.category] = (categories[t.category] || 0) + amount;
        });
      
      // Converti in arrays
      const labels = [];
      const data = [];
      const colors = [];
      
      Object.entries(categories)
        .sort(([, a], [, b]) => b - a) // Ordina per importo decrescente
        .forEach(([cat, amount]) => {
          labels.push(categoryLabels[cat] || cat);
          data.push(amount);
          colors.push(categoryColors[cat] || '#6b7280');
        });
      
      return { labels, data, colors };
    } catch (error) {
      ErrorHandler.handle(error, 'AnalyticsModule.getExpensesByCategory');
      return { labels: [], data: [], colors: [] };
    }
  },

  /**
   * Calcola tasso di occupazione per periodo
   * @param {number} months - Numero di mesi da analizzare
   * @returns {object} - { labels, occupancyRate }
   */
  getOccupancyRate(months = 12) {
    try {
      const bookings = BookingsModule.getAll();
      const now = new Date();
      const startDate = new Date(now.getFullYear(), now.getMonth() - months + 1, 1);
      
      // Inizializza struttura dati
      const monthsData = {};
      for (let i = 0; i < months; i++) {
        const date = new Date(now.getFullYear(), now.getMonth() - months + 1 + i, 1);
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        const daysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
        monthsData[key] = { 
          occupiedDays: 0, 
          totalDays: daysInMonth,
          label: this.formatMonthLabel(date)
        };
      }
      
      // Calcola giorni occupati per mese
      bookings.forEach(booking => {
        const checkIn = new Date(booking.checkIn);
        const checkOut = new Date(booking.checkOut);
        
        if (checkOut >= startDate) {
          let currentDate = new Date(Math.max(checkIn, startDate));
          const endDate = checkOut;
          
          while (currentDate < endDate) {
            const key = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
            if (monthsData[key]) {
              monthsData[key].occupiedDays++;
            }
            currentDate.setDate(currentDate.getDate() + 1);
          }
        }
      });
      
      // Calcola percentuali
      const labels = [];
      const occupancyRate = [];
      
      Object.keys(monthsData).sort().forEach(key => {
        const data = monthsData[key];
        labels.push(data.label);
        const rate = (data.occupiedDays / data.totalDays) * 100;
        occupancyRate.push(Math.min(100, rate)); // Cap a 100%
      });
      
      return { labels, occupancyRate };
    } catch (error) {
      ErrorHandler.handle(error, 'AnalyticsModule.getOccupancyRate');
      return { labels: [], occupancyRate: [] };
    }
  },

  /**
   * Calcola distribuzione prenotazioni per canale
   * @param {number} months - Numero di mesi da analizzare
   * @returns {object} - { labels, data, colors }
   */
  getBookingsByChannel(months = 12) {
    try {
      const bookings = BookingsModule.getAll();
      const now = new Date();
      const startDate = new Date(now.getFullYear(), now.getMonth() - months + 1, 1);
      
      const channels = {};
      const channelLabels = {
        direct: 'Diretto',
        'booking.com': 'Booking.com',
        airbnb: 'Airbnb',
        vrbo: 'VRBO',
        other: 'Altro'
      };
      
      const channelColors = {
        direct: '#10b981',
        'booking.com': '#3b82f6',
        airbnb: '#ec4899',
        vrbo: '#f59e0b',
        other: '#6b7280'
      };
      
      // Conta prenotazioni per canale
      bookings
        .filter(b => new Date(b.checkIn) >= startDate)
        .forEach(b => {
          const channel = b.channel || 'other';
          channels[channel] = (channels[channel] || 0) + 1;
        });
      
      // Converti in arrays
      const labels = [];
      const data = [];
      const colors = [];
      
      Object.entries(channels)
        .sort(([, a], [, b]) => b - a)
        .forEach(([channel, count]) => {
          labels.push(channelLabels[channel] || channel);
          data.push(count);
          colors.push(channelColors[channel] || '#6b7280');
        });
      
      return { labels, data, colors };
    } catch (error) {
      ErrorHandler.handle(error, 'AnalyticsModule.getBookingsByChannel');
      return { labels: [], data: [], colors: [] };
    }
  },

  /**
   * Calcola KPI principali
   * @param {number} months - Numero di mesi da analizzare
   * @returns {object} - KPIs con valori e variazioni
   */
  getKPIs(months = 12) {
    try {
      const transactions = AccountingModule.getAll();
      const bookings = BookingsModule.getAll();
      const now = new Date();
      const periodStart = new Date(now.getFullYear(), now.getMonth() - months + 1, 1);
      const prevPeriodStart = new Date(now.getFullYear(), now.getMonth() - months * 2 + 1, 1);
      
      // Calcola revenue periodo corrente e precedente
      let currentRevenue = 0;
      let prevRevenue = 0;
      
      transactions.forEach(t => {
        const tDate = new Date(t.date);
        const amount = parseFloat(t.amount) || 0;
        
        if (t.type === 'income') {
          if (tDate >= periodStart) {
            currentRevenue += amount;
          } else if (tDate >= prevPeriodStart && tDate < periodStart) {
            prevRevenue += amount;
          }
        }
      });
      
      // Calcola bookings periodo corrente e precedente
      let currentBookings = 0;
      let prevBookings = 0;
      
      bookings.forEach(b => {
        const checkIn = new Date(b.checkIn);
        if (checkIn >= periodStart) {
          currentBookings++;
        } else if (checkIn >= prevPeriodStart && checkIn < periodStart) {
          prevBookings++;
        }
      });
      
      // Calcola tasso occupazione
      const occupancyData = this.getOccupancyRate(months);
      const avgOccupancy = occupancyData.occupancyRate.length > 0
        ? occupancyData.occupancyRate.reduce((a, b) => a + b, 0) / occupancyData.occupancyRate.length
        : 0;
      
      const prevOccupancyData = this.getOccupancyRate(months * 2);
      const prevAvgOccupancy = prevOccupancyData.occupancyRate.length > months
        ? prevOccupancyData.occupancyRate.slice(0, months).reduce((a, b) => a + b, 0) / months
        : 0;
      
      // Calcola revenue media per prenotazione
      const avgRevenue = currentBookings > 0 ? currentRevenue / currentBookings : 0;
      const prevAvgRevenue = prevBookings > 0 ? prevRevenue / prevBookings : 0;
      
      // Calcola variazioni percentuali
      const revenueChange = this.calculatePercentChange(currentRevenue, prevRevenue);
      const occupancyChange = this.calculatePercentChange(avgOccupancy, prevAvgOccupancy);
      const bookingsChange = this.calculatePercentChange(currentBookings, prevBookings);
      const avgRevenueChange = this.calculatePercentChange(avgRevenue, prevAvgRevenue);
      
      return {
        revenue: {
          value: currentRevenue,
          change: revenueChange,
          formatted: `€${currentRevenue.toLocaleString('it-IT', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
        },
        occupancy: {
          value: avgOccupancy,
          change: occupancyChange,
          formatted: `${avgOccupancy.toFixed(1)}%`
        },
        bookings: {
          value: currentBookings,
          change: bookingsChange,
          formatted: currentBookings.toString()
        },
        avgRevenue: {
          value: avgRevenue,
          change: avgRevenueChange,
          formatted: `€${avgRevenue.toLocaleString('it-IT', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
        }
      };
    } catch (error) {
      ErrorHandler.handle(error, 'AnalyticsModule.getKPIs');
      return {
        revenue: { value: 0, change: 0, formatted: '€0' },
        occupancy: { value: 0, change: 0, formatted: '0%' },
        bookings: { value: 0, change: 0, formatted: '0' },
        avgRevenue: { value: 0, change: 0, formatted: '€0' }
      };
    }
  },

  /**
   * Calcola variazione percentuale
   * @param {number} current - Valore corrente
   * @param {number} previous - Valore precedente
   * @returns {number} - Variazione percentuale
   */
  calculatePercentChange(current, previous) {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  },

  /**
   * Formatta etichetta mese
   * @param {Date} date - Data da formattare
   * @returns {string} - Etichetta formattata
   */
  formatMonthLabel(date) {
    const months = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];
    return `${months[date.getMonth()]} ${date.getFullYear()}`;
  }
};
