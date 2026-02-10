const puppeteer = require('puppeteer');
const PDFDocument = require('pdfkit');

let browser = null;

/**
 * Initialize Puppeteer browser
 * @returns {Promise<object>} Browser instance
 */
const initializeBrowser = async () => {
  if (browser) {
    return browser;
  }

  try {
    console.log('Initializing Puppeteer browser...');
    
    const launchOptions = {
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu'
      ]
    };

    // Use custom Chromium path if provided (for Docker)
    if (process.env.PUPPETEER_EXECUTABLE_PATH) {
      launchOptions.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
    }

    browser = await puppeteer.launch(launchOptions);
    console.log('✓ Puppeteer browser initialized');
    
    return browser;
  } catch (error) {
    console.error('✗ Failed to initialize Puppeteer browser:', error);
    throw error;
  }
};

/**
 * Generate PDF from HTML content
 * @param {string} htmlContent - HTML content to convert
 * @param {object} options - PDF generation options
 * @returns {Promise<Buffer>} PDF buffer
 */
const generateFromHTML = async (htmlContent, options = {}) => {
  try {
    const browserInstance = await initializeBrowser();
    const page = await browserInstance.newPage();

    // Set viewport for consistent rendering
    await page.setViewport({
      width: options.width || 1920,
      height: options.height || 1080,
      deviceScaleFactor: options.deviceScaleFactor || 2
    });

    // Set content and wait for rendering
    await page.setContent(htmlContent, {
      waitUntil: 'networkidle0'
    });

    // Additional wait time for dynamic content (charts, 3D renders)
    const waitTime = options.waitTime || 2000;
    await page.waitForTimeout(waitTime);

    // Generate PDF
    const pdfOptions = {
      format: options.format || 'A4',
      landscape: options.landscape !== undefined ? options.landscape : true,
      printBackground: true,
      margin: options.margin || {
        top: '20px',
        right: '20px',
        bottom: '20px',
        left: '20px'
      }
    };

    const buffer = await page.pdf(pdfOptions);

    await page.close();

    console.log(`✓ PDF generated (${(buffer.length / 1024).toFixed(2)} KB)`);
    return buffer;

  } catch (error) {
    console.error('Error generating PDF:', error);
    throw error;
  }
};

/**
 * Capture screenshot from HTML content
 * @param {string} htmlContent - HTML content to capture
 * @param {object} options - Screenshot options
 * @returns {Promise<Buffer>} Image buffer
 */
const captureScreenshot = async (htmlContent, options = {}) => {
  try {
    const browserInstance = await initializeBrowser();
    const page = await browserInstance.newPage();

    // Set viewport
    await page.setViewport({
      width: options.width || 1920,
      height: options.height || 1080,
      deviceScaleFactor: options.quality || 2
    });

    // Set content
    await page.setContent(htmlContent, {
      waitUntil: 'networkidle0'
    });

    // Wait for rendering
    const waitTime = options.waitTime || 2000;
    await page.waitForTimeout(waitTime);

    // Capture screenshot
    const screenshotOptions = {
      type: options.type || 'png',
      fullPage: options.fullPage !== undefined ? options.fullPage : true
    };

    if (options.type === 'jpeg' || options.type === 'jpg') {
      screenshotOptions.quality = options.jpegQuality || 90;
    }

    const buffer = await page.screenshot(screenshotOptions);

    await page.close();

    console.log(`✓ Screenshot captured (${(buffer.length / 1024).toFixed(2)} KB)`);
    return buffer;

  } catch (error) {
    console.error('Error capturing screenshot:', error);
    throw error;
  }
};

/**
 * Create combined PDF report with multiple visualizations
 * @param {Array} visualizations - Array of {htmlContent, title, options}
 * @param {object} metadata - Report metadata
 * @returns {Promise<Buffer>} PDF buffer
 */
const createCombinedPDF = async (visualizations, metadata = {}) => {
  try {
    console.log(`Creating combined PDF with ${visualizations.length} visualization(s)...`);

    // Capture screenshots of all visualizations
    const images = [];
    for (let i = 0; i < visualizations.length; i++) {
      const viz = visualizations[i];
      console.log(`Capturing visualization ${i + 1}/${visualizations.length}: ${viz.title || 'Untitled'}`);
      
      const imageBuffer = await captureScreenshot(viz.htmlContent, {
        ...viz.options,
        type: 'png',
        width: 1920,
        height: 1080
      });

      images.push({
        buffer: imageBuffer,
        title: viz.title || `Visualization ${i + 1}`
      });
    }

    // Create PDF document using PDFKit
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({
        size: 'A4',
        layout: 'landscape',
        margin: 50
      });

      const chunks = [];
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => {
        const buffer = Buffer.concat(chunks);
        console.log(`✓ Combined PDF created (${(buffer.length / 1024).toFixed(2)} KB)`);
        resolve(buffer);
      });
      doc.on('error', reject);

      // Add title page
      doc.fontSize(24).text(metadata.title || 'Drilling ROP Visualization Report', {
        align: 'center'
      });
      doc.moveDown();
      
      if (metadata.wellName) {
        doc.fontSize(16).text(`Well: ${metadata.wellName}`, { align: 'center' });
        doc.moveDown();
      }

      doc.fontSize(12).text(`Generated: ${new Date().toLocaleString()}`, { align: 'center' });
      doc.fontSize(10).text(`Total Visualizations: ${visualizations.length}`, { align: 'center' });

      // Add each visualization as a new page
      images.forEach((img, index) => {
        doc.addPage();
        
        // Add title
        doc.fontSize(16).text(img.title, { align: 'center' });
        doc.moveDown();

        // Add image (fit to page width)
        const maxWidth = doc.page.width - 100;
        const maxHeight = doc.page.height - 150;

        doc.image(img.buffer, {
          fit: [maxWidth, maxHeight],
          align: 'center',
          valign: 'center'
        });

        // Add page number
        doc.fontSize(10).text(
          `Page ${index + 2} of ${images.length + 1}`,
          50,
          doc.page.height - 50,
          { align: 'center' }
        );
      });

      doc.end();
    });

  } catch (error) {
    console.error('Error creating combined PDF:', error);
    throw error;
  }
};

/**
 * Close Puppeteer browser
 * @returns {Promise<void>}
 */
const closeBrowser = async () => {
  if (browser) {
    await browser.close();
    browser = null;
    console.log('Puppeteer browser closed');
  }
};

/**
 * Get browser status
 * @returns {object} Browser status
 */
const getStatus = () => {
  return {
    initialized: browser !== null,
    connected: browser ? browser.isConnected() : false
  };
};

module.exports = {
  initializeBrowser,
  generateFromHTML,
  captureScreenshot,
  createCombinedPDF,
  closeBrowser,
  getStatus
};
