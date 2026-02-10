const express = require('express');
const router = express.Router();
const pdfService = require('../services/pdfService');

/**
 * POST /api/pdf/generate
 * Generate PDF from HTML content
 */
router.post('/generate', async (req, res) => {
  try {
    const { html, options = {} } = req.body;

    if (!html) {
      return res.status(400).json({
        success: false,
        error: 'HTML content is required'
      });
    }

    console.log('Generating PDF from HTML...');
    const pdfBuffer = await pdfService.generateFromHTML(html, options);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="drilling-report-${Date.now()}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    
    res.send(pdfBuffer);

  } catch (error) {
    console.error('Error generating PDF:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate PDF',
      message: error.message
    });
  }
});

/**
 * POST /api/pdf/screenshot
 * Capture screenshot from HTML content
 */
router.post('/screenshot', async (req, res) => {
  try {
    const { html, options = {} } = req.body;

    if (!html) {
      return res.status(400).json({
        success: false,
        error: 'HTML content is required'
      });
    }

    console.log('Capturing screenshot from HTML...');
    const imageBuffer = await pdfService.captureScreenshot(html, options);

    const imageType = options.type || 'png';
    const mimeTypes = {
      'png': 'image/png',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg'
    };

    res.setHeader('Content-Type', mimeTypes[imageType] || 'image/png');
    res.setHeader('Content-Disposition', `attachment; filename="drilling-screenshot-${Date.now()}.${imageType}"`);
    res.setHeader('Content-Length', imageBuffer.length);
    
    res.send(imageBuffer);

  } catch (error) {
    console.error('Error capturing screenshot:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to capture screenshot',
      message: error.message
    });
  }
});

/**
 * POST /api/pdf/generate/combined
 * Generate combined PDF report with multiple visualizations
 */
router.post('/generate/combined', async (req, res) => {
  try {
    const { visualizations, metadata = {} } = req.body;

    if (!visualizations || !Array.isArray(visualizations) || visualizations.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Visualizations array is required and must not be empty'
      });
    }

    // Validate each visualization has htmlContent
    for (let i = 0; i < visualizations.length; i++) {
      if (!visualizations[i].htmlContent && !visualizations[i].html) {
        return res.status(400).json({
          success: false,
          error: `Visualization at index ${i} is missing htmlContent`
        });
      }
      // Normalize property name
      if (visualizations[i].html && !visualizations[i].htmlContent) {
        visualizations[i].htmlContent = visualizations[i].html;
      }
    }

    console.log(`Generating combined PDF with ${visualizations.length} visualization(s)...`);
    const pdfBuffer = await pdfService.createCombinedPDF(visualizations, metadata);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="drilling-combined-report-${Date.now()}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    
    res.send(pdfBuffer);

  } catch (error) {
    console.error('Error generating combined PDF:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate combined PDF',
      message: error.message
    });
  }
});

/**
 * GET /api/pdf/status
 * Get PDF service status
 */
router.get('/status', (req, res) => {
  try {
    const status = pdfService.getStatus();
    res.json({
      success: true,
      status
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get PDF service status',
      message: error.message
    });
  }
});

module.exports = router;
