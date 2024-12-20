// controllers/puppeteerController.js

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

class PuppeteerController {
    constructor(options) {
        this.userDataDir = options.userDataDir;
        this.browser = null;
    }

    async init() {
        try {
            this.browser = await puppeteer.launch({
                headless: false, // Run in headful mode to allow manual interaction
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--start-maximized'
                ],
                userDataDir: this.userDataDir
            });

            const pages = await this.browser.pages();
            this.page = pages.length > 0 ? pages[0] : await this.browser.newPage();
            await this.page.setViewport({ width: 1920, height: 1080 });

            console.log('Puppeteer initialized. Logged-in session retained.');
        } catch (error) {
            console.error('Error initializing Puppeteer:', error);
            throw error;
        }
    }

    /**
     * Processes the image by navigating to Google Lens, uploading the image via drag-and-drop, and taking a screenshot.
     * @param {string} imagePath - The local path to the image to be processed.
     * @returns {string} - The path to the saved screenshot.
     */
    async processImage(imagePath) {
        let page = null;
        try {
            // Open a new tab for Google Lens
            page = await this.browser.newPage();
            await page.setViewport({ width: 1920, height: 1080 });

            // Navigate to Google Lens
            await page.goto('https://lens.google.com/search?p', { waitUntil: 'networkidle2' });
            console.log('Navigated to Google Lens.');

            // Wait for the page to fully load
            await page.waitForTimeout(5000); // Increased wait time

            // Simulate drag-and-drop anywhere on the page
            await this.simulateDragAndDrop(page, imagePath);
            console.log('Image uploaded via drag-and-drop.');

            // Wait for processing to complete
            await page.waitForTimeout(5000); // Increased wait time

            // Take a screenshot of the viewport
            const screenshotBuffer = await page.screenshot({ fullPage: false });

            // Ensure the screenshots directory exists
            const screenshotsDir = path.join(__dirname, '..', 'screenshots');
            if (!fs.existsSync(screenshotsDir)) {
                fs.mkdirSync(screenshotsDir);
            }

            // Save the screenshot
            const filename = `lens_screenshot_${Date.now()}.png`;
            const filepath = path.join(screenshotsDir, filename);
            fs.writeFileSync(filepath, screenshotBuffer);
            console.log(`Screenshot saved: ${filename}`);

            // Close the tab
            await page.close();

            // Return the path to the saved screenshot
            return `/screenshots/${filename}`;
        } catch (error) {
            console.error('Error processing image with Puppeteer:', error.message);
            if (page) await page.close();
            throw error;
        }
    }

    /**
     * Simulates drag-and-drop of an image anywhere on the page using mouse events.
     * @param {object} page - The Puppeteer page instance.
     * @param {string} filePath - The path to the image file.
     */
    async simulateDragAndDrop(page, filePath) {
        const dropZoneSelector = 'body'; // Dropping on the body

        // Read the image file and convert it to Base64
        const imageBuffer = fs.readFileSync(filePath);
        const imageBase64 = imageBuffer.toString('base64');

        // Inject the image into the page
        const image = await page.evaluateHandle((base64) => {
            const img = document.createElement('img');
            img.src = `data:image/png;base64,${base64}`;
            img.style.position = 'absolute';
            img.style.left = '-9999px'; // Hide the image off-screen
            document.body.appendChild(img);
            return img;
        }, imageBase64);

        // Get the bounding box of the drop zone
        const dropZone = await page.$(dropZoneSelector);
        const dropBox = await dropZone.boundingBox();

        // Define drag start and end positions
        const dragStartX = dropBox.x + dropBox.width / 2;
        const dragStartY = dropBox.y + dropBox.height / 2;
        const dragEndX = dragStartX + 100; // Adjust as needed
        const dragEndY = dragStartY + 100; // Adjust as needed

        // Simulate drag-and-drop using mouse events
        await page.mouse.move(dragStartX, dragStartY);
        await page.mouse.down();
        await page.mouse.move(dragEndX, dragEndY, { steps: 20 });
        await page.mouse.up();

        // Remove the injected image
        await image.dispose();
    }

    async close() {
        if (this.browser) {
            await this.browser.close();
            console.log('Puppeteer browser closed.');
        }
    }
}

module.exports = PuppeteerController;
