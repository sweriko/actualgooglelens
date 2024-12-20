// server.js

const express = require('express');
const path = require('path');
const http = require('http');
const dotenv = require('dotenv');
const axios = require('axios');
const fs = require('fs');
const { isURL } = require('validator');
const PuppeteerController = require('./controllers/puppeteerController');

// Load environment variables
dotenv.config();

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 3000;
const USER_DATA_DIR = process.env.USER_DATA_DIR || './puppeteer_data';

// Initialize Puppeteer Controller
const puppeteerController = new PuppeteerController({
    userDataDir: USER_DATA_DIR
});

// Initialize Puppeteer
puppeteerController.init().then(() => {
    console.log('Puppeteer initialized. Logged-in session retained.');
}).catch(error => {
    console.error('Failed to initialize Puppeteer:', error);
    process.exit(1);
});

// Middleware to parse JSON and URL-encoded bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Serve images and screenshots statically
app.use('/images', express.static(path.join(__dirname, 'images')));
app.use('/screenshots', express.static(path.join(__dirname, 'screenshots')));

/**
 * @route POST /api/process-image
 * @desc Receives an image URL, downloads it, processes it with Puppeteer, and returns the screenshot path
 * @access Public (Consider adding authentication for production)
 */
app.post('/api/process-image', async (req, res) => {
    const { imageUrl } = req.body;

    console.log(`Received image URL: ${imageUrl}`);

    // Basic URL validation using validator
    if (!imageUrl || typeof imageUrl !== 'string' || !isURL(imageUrl, { protocols: ['http', 'https'], require_protocol: true })) {
        console.log('Invalid Image URL provided.');
        return res.status(400).json({ success: false, message: 'Invalid Image URL provided.' });
    }

    try {
        // Download the image
        const urlPath = new URL(imageUrl).pathname;
        const imageExt = path.extname(urlPath) || '.png';
        const imageFilename = `image_${Date.now()}${imageExt}`;
        const imagePath = path.join(__dirname, 'images', imageFilename);

        console.log(`Downloading image to: ${imagePath}`);

        const writer = fs.createWriteStream(imagePath);
        const response = await axios({
            url: imageUrl,
            method: 'GET',
            responseType: 'stream'
        });

        response.data.pipe(writer);

        // Wait until the download is complete
        await new Promise((resolve, reject) => {
            writer.on('finish', resolve);
            writer.on('error', reject);
        });

        console.log(`Image downloaded: ${imageFilename}`);

        // Process the image with Puppeteer
        console.log('Starting image processing with Puppeteer...');
        const screenshotPath = await puppeteerController.processImage(imagePath);
        console.log(`Image processed. Screenshot saved at: ${screenshotPath}`);

        return res.status(200).json({ success: true, screenshotUrl: screenshotPath });
    } catch (error) {
        console.error('Error processing image:', error.message);
        return res.status(500).json({ success: false, message: 'Failed to process the image.' });
    }
});

// Fallback route to serve the frontend
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start the server
server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

// Graceful shutdown
const gracefulShutdown = () => {
    console.log('\nShutting down gracefully...');
    puppeteerController.close().then(() => {
        process.exit(0);
    }).catch(error => {
        console.error('Error during shutdown:', error);
        process.exit(1);
    });
};

process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);
