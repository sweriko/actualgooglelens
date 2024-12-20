// public/script.js

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('image-form');
    const imageUrlInput = document.getElementById('imageUrl');
    const statusDiv = document.getElementById('status');
    const resultDiv = document.getElementById('result');
    const resultImage = document.getElementById('result-image');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const imageUrl = imageUrlInput.value.trim();
        if (!imageUrl) {
            statusDiv.textContent = 'Please enter a valid image URL.';
            resultDiv.style.display = 'none';
            return;
        }

        statusDiv.textContent = 'Processing...';
        resultDiv.style.display = 'none';
        resultImage.src = '';
        resultImage.alt = 'Screenshot will appear here';

        try {
            const response = await fetch('/api/process-image', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ imageUrl })
            });

            const data = await response.json();

            if (data.success) {
                statusDiv.textContent = 'Image processed successfully!';
                resultImage.src = data.screenshotUrl;
                resultImage.alt = 'Google Lens Results';
                resultDiv.style.display = 'block';
            } else {
                statusDiv.textContent = `Error: ${data.message}`;
                resultDiv.style.display = 'none';
            }
        } catch (error) {
            console.error('Error:', error);
            statusDiv.textContent = 'An error occurred while processing your request.';
            resultDiv.style.display = 'none';
        }
    });
});
