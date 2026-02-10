import axios from 'axios';

// Create axios instance with base configuration
const apiClient = axios.create({
  baseURL: 'http://localhost:3001/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Data API functions
export const dataAPI = {
  /**
   * Get historical data from the backend
   * @param {Object} params - Query parameters
   * @param {number} params.limit - Maximum number of records to return
   * @param {string} params.startDate - Start date for filtering (ISO string)
   * @param {string} params.endDate - End date for filtering (ISO string)
   * @param {number} params.minDepth - Minimum depth for filtering
   * @param {number} params.maxDepth - Maximum depth for filtering
   * @returns {Promise<Array>} Array of data points
   */
  getHistoricalData: async (params = {}) => {
    try {
      const response = await apiClient.get('/data/historical', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching historical data:', error);
      throw error;
    }
  },
  
  /**
   * Get statistics about the data
   * @param {Object} params - Query parameters for filtering
   * @returns {Promise<Object>} Statistics object
   */
  getStatistics: async (params = {}) => {
    try {
      const response = await apiClient.get('/data/statistics', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching statistics:', error);
      throw error;
    }
  },
  
  /**
   * Get depth intervals data
   * @param {Object} params - Query parameters
   * @param {number} params.intervalSize - Size of depth intervals
   * @returns {Promise<Array>} Array of depth interval statistics
   */
  getDepthIntervals: async (params = {}) => {
    try {
      const response = await apiClient.get('/data/depth-intervals', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching depth intervals:', error);
      throw error;
    }
  }
};

// PDF API functions
export const pdfAPI = {
  /**
   * Generate PDF from HTML content
   * @param {string} htmlContent - HTML content to convert to PDF
   * @param {Object} options - PDF generation options
   * @param {string} options.format - Page format (A4, Letter, etc.)
   * @param {boolean} options.landscape - Landscape orientation
   * @returns {Promise<Blob>} PDF blob
   */
  generatePDFFromHTML: async (htmlContent, options = {}) => {
    try {
      const response = await axios.post(
        'http://localhost:3001/api/pdf/generate',
        {
          html: htmlContent,
          options: {
            format: options.format || 'A4',
            landscape: options.landscape || false,
            printBackground: true,
            margin: {
              top: '20px',
              right: '20px',
              bottom: '20px',
              left: '20px'
            },
            ...options
          }
        },
        {
          responseType: 'blob',
          timeout: 60000,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
      return response.data;
    } catch (error) {
      console.error('Error generating PDF:', error);
      throw error;
    }
  },
  
  /**
   * Capture screenshot from HTML content
   * @param {string} htmlContent - HTML content to capture
   * @param {Object} options - Screenshot options
   * @param {string} options.type - Image type (png, jpeg)
   * @param {number} options.quality - Image quality (0-100)
   * @returns {Promise<Blob>} Image blob
   */
  captureScreenshot: async (htmlContent, options = {}) => {
    try {
      const response = await axios.post(
        'http://localhost:3001/api/pdf/screenshot',
        {
          html: htmlContent,
          options: {
            type: options.type || 'png',
            quality: options.quality || 90,
            fullPage: true,
            ...options
          }
        },
        {
          responseType: 'blob',
          timeout: 60000,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
      return response.data;
    } catch (error) {
      console.error('Error capturing screenshot:', error);
      throw error;
    }
  },
  
  /**
   * Download blob as file
   * @param {Blob} blob - Blob to download
   * @param {string} filename - Filename for download
   */
  downloadBlob: (blob, filename) => {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }
};

// Export default instance
export default apiClient;
