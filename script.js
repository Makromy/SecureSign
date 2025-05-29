// Global variables
let currentStep = 1;
let pdfFile = null;
let idImage = null;
let selfieImage = null;
let deviceInfo = {};
let signedPdfBlob = null;

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    setupEventListeners();
    generateDeviceInfo();
});

function initializeApp() {
    updateProgressBar();
    updateNavigation();
    updateTimestamp();
    generateDeviceInfo();
    // Show device info immediately
    setTimeout(() => {
        updateDeviceInfoDisplay();
    }, 500);
}

function setupEventListeners() {
    // File uploads
    document.getElementById('pdfFile').addEventListener('change', handlePdfUpload);
    document.getElementById('idFile').addEventListener('change', handleIdUpload); // For upload option

    // ID Capture Mode Toggles
    document.getElementById('showIdUploadBtn').addEventListener('click', () => showIdCaptureMode('upload'));
    document.getElementById('showIdScanBtn').addEventListener('click', () => showIdCaptureMode('scan'));

    // ID Camera controls
    document.getElementById('startIdCameraBtn').addEventListener('click', startIdCamera);
    document.getElementById('captureIdPhotoBtn').addEventListener('click', captureIdPhoto);
    document.getElementById('retakeIdPhotoBtn').addEventListener('click', retakeIdPhoto);
    
    // Selfie Camera controls
    document.getElementById('startCamera').addEventListener('click', startCamera);
    document.getElementById('capturePhoto').addEventListener('click', capturePhoto);
    document.getElementById('retakePhoto').addEventListener('click', retakePhoto);
    
    // Signature generation
    document.getElementById('generateSignature').addEventListener('click', generateSignature);
    document.getElementById('downloadPdf').addEventListener('click', downloadSignedPdf);
    
    // Navigation
    document.getElementById('nextBtn').addEventListener('click', nextStep);
    document.getElementById('prevBtn').addEventListener('click', prevStep);
}

// Step navigation
function nextStep() {
    if (validateCurrentStep()) {
        if (currentStep < 5) {
            currentStep++;
            showStep(currentStep);
            updateProgressBar();
            updateNavigation();
        }
    }
}

function prevStep() {
    if (currentStep > 1) {
        currentStep--;
        showStep(currentStep);
        updateProgressBar();
        updateNavigation();
    }
}

function showStep(step) {
    // Hide all steps
    document.querySelectorAll('.step-content').forEach(content => {
        content.classList.add('hidden');
    });
    
    // Show current step
    document.getElementById(`step${step}`).classList.remove('hidden');
}

function updateProgressBar() {
    document.querySelectorAll('.step').forEach((step, index) => {
        step.classList.remove('active', 'completed');
        if (index + 1 < currentStep) {
            step.classList.add('completed');
        } else if (index + 1 === currentStep) {
            step.classList.add('active');
        }
    });
}

function updateNavigation() {
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    
    prevBtn.style.display = currentStep > 1 ? 'inline-block' : 'none';
    nextBtn.style.display = currentStep < 5 ? 'inline-block' : 'none';
    
    // Update next button state
    if (currentStep < 5) {
        nextBtn.disabled = !validateCurrentStep();
    }
}

function validateCurrentStep() {
    switch (currentStep) {
        case 1:
            return pdfFile !== null;
        case 2:
            return idImage !== null;
        case 3:
            return selfieImage !== null;
        case 4:
            return true;
        default:
            return false;
    }
}

// PDF Upload Handler
function handlePdfUpload(event) {
    const file = event.target.files[0];
    if (file && file.type === 'application/pdf') {
        pdfFile = file;
        displayPdfPreview(file);
        updateNavigation();
    } else {
        alert('Please select a valid PDF file.');
    }
}

function displayPdfPreview(file) {
    const preview = document.getElementById('pdfPreview');
    preview.innerHTML = `
        <div class="file-info">
            <h3>📄 ${file.name}</h3>
            <p>Size: ${(file.size / 1024 / 1024).toFixed(2)} MB</p>
            <p>Type: ${file.type}</p>
            <div class="success-message">✅ PDF loaded successfully</div>
        </div>
    `;
}

// ID Upload Handler
function handleIdUpload(event) {
    const file = event.target.files[0];
    if (file && file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = function(e) {
            idImage = e.target.result;
            displayImagePreview('idPreview', idImage, 'ID Document uploaded successfully');
            updateNavigation();
            // Ensure camera is stopped if it was active for ID scanning
            stopIdCameraStream(); 
        };
        reader.readAsDataURL(file);
    } else {
        alert('Please select a valid image file.');
    }
}

// Function to toggle between ID upload and scan sections
function showIdCaptureMode(mode) {
    const uploadSection = document.getElementById('idUploadSection');
    const scanSection = document.getElementById('idScanSection');
    const idPreview = document.getElementById('idPreview');

    if (mode === 'upload') {
        uploadSection.style.display = 'block';
        scanSection.style.display = 'none';
        stopIdCameraStream(); // Stop camera if switching from scan mode
    } else if (mode === 'scan') {
        uploadSection.style.display = 'none';
        scanSection.style.display = 'block';
        // Optionally clear previous upload preview if any
        // idImage = null; 
        // idPreview.innerHTML = ''; 
        // updateNavigation();
    }
}

function displayImagePreview(containerId, imageSrc, message) {
    const container = document.getElementById(containerId);
    container.innerHTML = `
        <img src="${imageSrc}" alt="Preview" style="max-width: 100%; max-height: 300px; border-radius: 10px;">
        <div class="success-message" style="margin-top: 15px; color: #28a745; font-weight: 600;">✅ ${message}</div>
    `;
}

// Camera functionality
let stream = null;
let video = null;
let canvas = null;

function startCamera() {
    video = document.getElementById('video');
    canvas = document.getElementById('canvas');
    
    navigator.mediaDevices.getUserMedia({ 
        video: { 
            width: { ideal: 640 },
            height: { ideal: 480 },
            facingMode: 'user'
        } 
    })
    .then(function(mediaStream) {
        stream = mediaStream;
        video.srcObject = stream;
        video.style.display = 'block';
        
        document.getElementById('startCamera').style.display = 'none';
        document.getElementById('capturePhoto').style.display = 'inline-block';
    })
    .catch(function(error) {
        console.error('Camera access error:', error);
        alert('Unable to access camera. Please ensure camera permissions are granted.');
    });
}

function capturePhoto() {
    if (video && canvas) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        const context = canvas.getContext('2d');
        context.drawImage(video, 0, 0);
        
        // Add timestamp overlay
        const timestamp = new Date().toLocaleString();
        context.font = '16px Arial';
        const textWidth = context.measureText(timestamp).width;
        context.fillStyle = 'rgba(255, 255, 255, 0.7)';
        context.fillRect(10, canvas.height - 40, textWidth + 20, 30);
        context.fillStyle = '#000000';
        context.fillText(timestamp, 20, canvas.height - 20);
        
        selfieImage = canvas.toDataURL('image/jpeg', 0.8);
        
        // Stop camera
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
        }
        
        video.style.display = 'none';
        displayImagePreview('selfiePreview', selfieImage, 'Selfie captured successfully');
        
        document.getElementById('capturePhoto').style.display = 'none';
        document.getElementById('retakePhoto').style.display = 'inline-block';
        
        updateNavigation();
    }
}

function retakePhoto() {
    selfieImage = null;
    document.getElementById('selfiePreview').innerHTML = '';
    document.getElementById('retakePhoto').style.display = 'none';
    // document.getElementById('capturePhoto').style.display = 'inline-block'; // Re-show capture button
    // document.getElementById('startCamera').style.display = 'inline-block'; // Re-show start camera if needed
    startCamera(); // Restart the selfie camera
}

// --- ID Camera Functionality ---
let idStream = null;
let idVideoEl = null;
let idCanvasEl = null;

function startIdCamera() {
    idVideoEl = document.getElementById('idVideo');
    idCanvasEl = document.getElementById('idCanvas');
    
    navigator.mediaDevices.getUserMedia({ 
        video: { 
            width: { ideal: 640 }, // Adjust as needed for ID cards
            height: { ideal: 480 },
            facingMode: 'environment' // Prefer rear camera for ID scanning
        } 
    })
    .then(function(mediaStream) {
        idStream = mediaStream;
        idVideoEl.srcObject = idStream;
        idVideoEl.style.display = 'block';
        document.getElementById('idPreview').innerHTML = ''; // Clear previous preview
        idImage = null; // Reset idImage
        updateNavigation();
        
        document.getElementById('startIdCameraBtn').style.display = 'none';
        document.getElementById('captureIdPhotoBtn').style.display = 'inline-block';
        document.getElementById('retakeIdPhotoBtn').style.display = 'none'; // Hide retake initially
    })
    .catch(function(error) {
        console.error('ID Camera access error:', error);
        // Fallback to user-facing camera if environment is not available
        if (error.name === 'OverconstrainedError' || error.name === 'NotFoundError') {
            console.log('Environment camera not found, trying user camera for ID.');
            navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } })
            .then(mediaStream => {
                idStream = mediaStream;
                idVideoEl.srcObject = idStream;
                idVideoEl.style.display = 'block';
                document.getElementById('idPreview').innerHTML = '';
                idImage = null;
                updateNavigation();
                document.getElementById('startIdCameraBtn').style.display = 'none';
                document.getElementById('captureIdPhotoBtn').style.display = 'inline-block';
            })
            .catch(err => {
                alert('Unable to access camera for ID scanning. Please ensure camera permissions are granted and try uploading.');
                console.error('Fallback ID camera error:', err);
            });
        } else {
            alert('Unable to access camera for ID scanning. Please ensure camera permissions are granted and try uploading.');
        }
    });
}

function captureIdPhoto() {
    if (idVideoEl && idCanvasEl) {
        idCanvasEl.width = idVideoEl.videoWidth;
        idCanvasEl.height = idVideoEl.videoHeight;
        
        const context = idCanvasEl.getContext('2d');
        context.drawImage(idVideoEl, 0, 0, idCanvasEl.width, idCanvasEl.height);
        
        idImage = idCanvasEl.toDataURL('image/jpeg', 0.9); // Use higher quality for IDs
        
        stopIdCameraStream();
        
        idVideoEl.style.display = 'none';
        displayImagePreview('idPreview', idImage, 'ID captured successfully');
        
        document.getElementById('captureIdPhotoBtn').style.display = 'none';
        document.getElementById('retakeIdPhotoBtn').style.display = 'inline-block';
        
        updateNavigation();
    }
}

function retakeIdPhoto() {
    idImage = null;
    document.getElementById('idPreview').innerHTML = '';
    document.getElementById('retakeIdPhotoBtn').style.display = 'none';
    // document.getElementById('captureIdPhotoBtn').style.display = 'inline-block'; // Re-show capture
    // document.getElementById('startIdCameraBtn').style.display = 'inline-block'; // Re-show start if needed
    startIdCamera(); // Restart the ID camera
}

function stopIdCameraStream() {
    if (idStream) {
        idStream.getTracks().forEach(track => track.stop());
        idStream = null;
    }
    if(idVideoEl) idVideoEl.style.display = 'none';
    // Ensure buttons are reset if stream stops unexpectedly or by switching mode
    // document.getElementById('startIdCameraBtn').style.display = 'inline-block';
    // document.getElementById('captureIdPhotoBtn').style.display = 'none';
    // document.getElementById('retakeIdPhotoBtn').style.display = 'none';
}

// Device verification functionality
function prepareDeviceVerification() {
    // Set device info as the verification method
    deviceInfo.timestamp = new Date().toISOString();
    
    // Update the device info display
    updateDeviceInfoDisplay();
    
    // Allow navigation to continue
    updateNavigation();
}

// Device information generation
function generateDeviceInfo() {
    deviceInfo = {
        deviceId: generateDeviceId(),
        deviceType: getDeviceType(),
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        language: navigator.language,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        screenResolution: `${screen.width}x${screen.height}`,
        timestamp: new Date().toLocaleString() // Ensure timestamp is set here
    };
    
    // Get IP address (simulated for demo)
    getIPAddress().then(ip => {
        deviceInfo.ipAddress = ip;
        // deviceInfo.timestamp = new Date().toLocaleString(); // Update timestamp again after async IP call if needed, or ensure it's set before this block
        updateDeviceInfoDisplay();
    });
}

function generateDeviceId() {
    // Generate a unique device ID based on various factors
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.fillText('Device fingerprint', 2, 2);
    
    const fingerprint = canvas.toDataURL() + 
                       navigator.userAgent + 
                       navigator.language + 
                       screen.width + screen.height;
    
    return generateSecureHash(fingerprint).substring(0, 12);
}

function getDeviceType() {
    const userAgent = navigator.userAgent;
    
    if (/iPhone/i.test(userAgent)) return 'iPhone';
    if (/iPad/i.test(userAgent)) return 'iPad';
    if (/Android/i.test(userAgent)) return 'Android Device';
    if (/Windows Phone/i.test(userAgent)) return 'Windows Phone';
    if (/Windows/i.test(userAgent)) return 'Windows PC';
    if (/Mac/i.test(userAgent)) return 'Mac';
    if (/Linux/i.test(userAgent)) return 'Linux PC';
    
    return 'Unknown Device';
}

async function getIPAddress() {
    try {
        // In a real application, you would use a service to get the real IP
        // For demo purposes, we'll simulate it
        return '192.168.' + Math.floor(Math.random() * 255) + '.' + Math.floor(Math.random() * 255);
    } catch (error) {
        return '127.0.0.1';
    }
}

function updateDeviceInfoDisplay() {
    document.getElementById('deviceId').textContent = deviceInfo.deviceId;
    document.getElementById('deviceType').textContent = deviceInfo.deviceType;
    document.getElementById('ipAddress').textContent = deviceInfo.ipAddress;
    document.getElementById('timestamp').textContent = new Date().toLocaleString();
}

function updateTimestamp() {
    const now = new Date();
    document.getElementById('signatureTimestamp').textContent = now.toLocaleString();
    
    // Update every second
    setTimeout(updateTimestamp, 1000);
}

// Signature generation
function generateSignature() {
    if (!validateAllSteps()) {
        alert('Please complete all required steps before generating the signature.');
        return;
    }
    
    const generateBtn = document.getElementById('generateSignature');
    generateBtn.disabled = true;
    generateBtn.textContent = '🔄 Generating...';
    
    // Update signature preview
    updateSignaturePreview();
    
    // Generate the signed PDF
    createSignedPdf().then(() => {
        generateBtn.style.display = 'none';
        document.getElementById('downloadPdf').style.display = 'inline-block';
    }).catch(error => {
        console.error('PDF generation error:', error);
        alert('Error generating signed PDF. Please try again.');
        generateBtn.disabled = false;
        generateBtn.textContent = '✅ Generate Signed PDF';
    });
}

function updateSignaturePreview() {
    // Update elements preview
    if (idImage) {
        document.querySelector('#idElement .element-preview').innerHTML = 
            `<img src="${idImage}" alt="ID" style="max-width: 100%; max-height: 100%; border-radius: 5px;">`;
    }
    
    if (selfieImage) {
        document.querySelector('#selfieElement .element-preview').innerHTML = 
            `<img src="${selfieImage}" alt="Selfie" style="max-width: 100%; max-height: 100%; border-radius: 5px;">`;
    }
    
    // Display device information
    const devicePreview = document.querySelector('#deviceElement .element-preview');
    devicePreview.innerHTML = `
        <div style="font-size: 0.8rem; padding: 10px;">
            <div>Device ID: ${deviceInfo.deviceId}</div>
            <div>Type: ${deviceInfo.deviceType}</div>
            <div>IP: ${deviceInfo.ipAddress}</div>
        </div>
    `;
    
    // Update signature details
    document.getElementById('securityHash').textContent = generateSecureHash().substring(0, 32) + '...';
}

// Error handling
window.addEventListener('error', function(event) {
    console.error('Application error:', event.error);
});

// Cleanup on page unload
window.addEventListener('beforeunload', function() {
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
    }
});

async function createSignedPdf() {
    try {
        // Read the original PDF
        const pdfBytes = await pdfFile.arrayBuffer();
        const pdfDoc = await PDFLib.PDFDocument.load(pdfBytes);
        const font = await pdfDoc.embedFont(PDFLib.StandardFonts.Helvetica); // Embed font once

        // Get the pages
        const pages = pdfDoc.getPages();

        // Add watermark to all pages
        const signedDate = new Date().toLocaleString();
        const watermarkText = `Signed: ${signedDate} | File: ${pdfFile.name}`;

        pages.forEach(page => {
            const { width, height } = page.getSize();
            page.drawText(watermarkText, {
                x: width / 2 - (watermarkText.length * 24) / 4, // Approximate center
                y: height / 2,
                size: 24,
                font: font, // Use embedded font
                color: PDFLib.rgb(0.8, 0.8, 0.8),  // Light gray
                opacity: 0.3,
                rotate: PDFLib.degrees(315),  // Diagonal orientation
            });
        });

        // Determine which pages to sign based on user selection
        const signOption = document.querySelector('input[name="signPageOption"]:checked').value;
        const pagesToSign = signOption === 'all' ? pages : [pages[pages.length - 1]];

        // Signature Block Configuration
        const margin = 20; // Margin from page edges
        const blockPadding = 5;
        const titleFontSize = 10;
        const contentFontSize = 8;
        const borderColor = PDFLib.rgb(0.8, 0.8, 0.8); // Light gray for border
        const textColor = PDFLib.rgb(0.2, 0.2, 0.2);
        const signatureBlockHeight = 80; // Height of each signature block's content area
        const titleHeight = titleFontSize + 5; // Space for title above block
        const totalBlockHeightWithTitle = signatureBlockHeight + titleHeight;
        const blockSpacing = 10; // Spacing between blocks
        const numBlocks = 3;

        // Embed images once if they exist
        let idImgEmbedded, selfieImgEmbedded;
        if (idImage) {
            try {
                const idImageBytes = await dataURLToArrayBuffer(idImage);
                idImgEmbedded = await embedImageToPdf(pdfDoc, idImageBytes, idImage);
            } catch (error) {
                console.log('Could not embed ID image:', error);
            }
        }
        if (selfieImage) {
            try {
                const selfieImageBytes = await dataURLToArrayBuffer(selfieImage);
                selfieImgEmbedded = await embedImageToPdf(pdfDoc, selfieImageBytes, selfieImage);
            } catch (error) {
                console.log('Could not embed selfie image:', error);
            }
        }

        for (const page of pagesToSign) {
            const { width, height: pageHeight } = page.getSize();
            const availableWidth = width - 2 * margin;
            const totalInterBlockSpacing = (numBlocks - 1) * blockSpacing;
            const blockWidth = (availableWidth - totalInterBlockSpacing) / numBlocks;

            // Y position for the bottom of the signature blocks (at page bottom margin)
            const blockBottomY = margin;
            // Y position for the top of the content area within blocks
            const contentAreaTopY = blockBottomY + signatureBlockHeight;
            // Y position for the titles (above the content area)
            const titleY = contentAreaTopY + 2; // Small gap between title and block top line

            let currentX = margin;

            // --- Block 1: ID Document ---
            page.drawText('ID Document:', {
                x: currentX + blockPadding,
                y: titleY,
                font: font,
                size: titleFontSize,
                color: textColor,
            });
            page.drawRectangle({
                x: currentX,
                y: blockBottomY,
                width: blockWidth,
                height: signatureBlockHeight,
                borderColor: borderColor,
                borderWidth: 1,
                borderDashArray: [5, 5],
            });
            if (idImgEmbedded) {
                const imgContentWidth = blockWidth - 2 * blockPadding;
                const imgContentHeight = signatureBlockHeight - 2 * blockPadding;
                const { width: actualImgWidth, height: actualImgHeight } = idImgEmbedded.scaleToFit(imgContentWidth, imgContentHeight);
                page.drawImage(idImgEmbedded, {
                    x: currentX + (blockWidth - actualImgWidth) / 2, // Center horizontally
                    y: blockBottomY + (signatureBlockHeight - actualImgHeight) / 2, // Center vertically
                    width: actualImgWidth,
                    height: actualImgHeight,
                });
            }
            currentX += blockWidth + blockSpacing;

            // --- Block 2: Selfie ---
            page.drawText('Selfie:', {
                x: currentX + blockPadding,
                y: titleY,
                font: font,
                size: titleFontSize,
                color: textColor,
            });
            page.drawRectangle({
                x: currentX,
                y: blockBottomY,
                width: blockWidth,
                height: signatureBlockHeight,
                borderColor: borderColor,
                borderWidth: 1,
                borderDashArray: [5, 5],
            });
            if (selfieImgEmbedded) {
                const imgContentWidth = blockWidth - 2 * blockPadding;
                const imgContentHeight = signatureBlockHeight - 2 * blockPadding;
                const { width: actualImgWidth, height: actualImgHeight } = selfieImgEmbedded.scaleToFit(imgContentWidth, imgContentHeight);
                page.drawImage(selfieImgEmbedded, {
                    x: currentX + (blockWidth - actualImgWidth) / 2,
                    y: blockBottomY + (signatureBlockHeight - actualImgHeight) / 2,
                    width: actualImgWidth,
                    height: actualImgHeight,
                });
            }
            currentX += blockWidth + blockSpacing;

            // --- Block 3: Device Verification ---
            page.drawText('Device Verification:', {
                x: currentX + blockPadding,
                y: titleY,
                font: font,
                size: titleFontSize,
                color: textColor,
            });
            page.drawRectangle({
                x: currentX,
                y: blockBottomY,
                width: blockWidth,
                height: signatureBlockHeight,
                borderColor: borderColor,
                borderWidth: 1,
                borderDashArray: [5, 5],
            });
            
            const deviceInfoLines = [
                `Device ID: ${deviceInfo.deviceId || 'N/A'}`,
                `Type: ${deviceInfo.deviceType || 'N/A'}`,
                `IP: ${deviceInfo.ipAddress || 'N/A'}`,
                `Time: ${deviceInfo.timestamp || 'N/A'}` // Add timestamp line
            ];

            const lineSpacing = contentFontSize + 3; // Adjusted line spacing
            const totalTextHeight = deviceInfoLines.length * lineSpacing - (lineSpacing - contentFontSize); // Calculate total height of text block
            // Calculate starting Y position to center the block of text vertically
            // Start from the top of where the first line of text should be drawn
            let textY = blockBottomY + (signatureBlockHeight - totalTextHeight) / 2 + (deviceInfoLines.length -1) * lineSpacing ; 

            deviceInfoLines.forEach(line => {
                const textWidth = font.widthOfTextAtSize(line, contentFontSize);
                const textX = currentX + (blockWidth - textWidth) / 2; // Center text horizontally
                if (textY >= blockBottomY + blockPadding && textY <= blockBottomY + signatureBlockHeight - blockPadding) { // Check if text fits
                    page.drawText(line, {
                        x: textX,
                        y: textY,
                        font: font,
                        size: contentFontSize,
                        color: textColor,
                    });
                    textY -= lineSpacing;
                }
            });
        }

        // Save the PDF
        const pdfBytesModified = await pdfDoc.save();
        signedPdfBlob = new Blob([pdfBytesModified], { type: 'application/pdf' });

        return true;
    } catch (error) {
        console.error('PDF creation failed at:', new Date().toISOString());
        console.error('Error details:', {
            message: error.message,
            stack: error.stack,
            pdfDocStatus: pdfDoc ? 'valid' : 'invalid',
            imagesStatus: {
                idImage: !!idImage,
                selfieImage: !!selfieImage
            }
        });
        throw error;
    }
}

function downloadSignedPdf() {
    if (signedPdfBlob) {
        const url = URL.createObjectURL(signedPdfBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `signed_${pdfFile.name}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
}

// Image handling utility functions
function dataURLToArrayBuffer(dataURL) {
    return new Promise((resolve, reject) => {
        try {
            const base64 = dataURL.split(',')[1];
            const binaryString = atob(base64);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }
            resolve(bytes.buffer);
        } catch (error) {
            reject(error);
        }
    });
}

async function embedImageToPdf(pdfDoc, imageBytes, dataURL) {
    try {
        // Determine image format from data URL
        const mimeType = dataURL.split(',')[0].split(':')[1].split(';')[0];
        
        if (mimeType === 'image/jpeg' || mimeType === 'image/jpg') {
            return await pdfDoc.embedJpg(imageBytes);
        } else if (mimeType === 'image/png') {
            return await pdfDoc.embedPng(imageBytes);
        } else {
            // Try to convert to JPEG format
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const img = new Image();
            
            return new Promise((resolve, reject) => {
                img.onload = async () => {
                    canvas.width = img.width;
                    canvas.height = img.height;
                    ctx.drawImage(img, 0, 0);
                    
                    canvas.toBlob(async (blob) => {
                        try {
                            const jpegBytes = await blob.arrayBuffer();
                            const embeddedImage = await pdfDoc.embedJpg(jpegBytes);
                            resolve(embeddedImage);
                        } catch (error) {
                            console.log('Failed to convert and embed image:', error);
                            resolve(null);
                        }
                    }, 'image/jpeg', 0.8);
                };
                
                img.onerror = () => {
                    console.log('Failed to load image for conversion');
                    resolve(null);
                };
                
                img.src = dataURL;
            });
        }
    } catch (error) {
        console.log('Image embedding error:', error);
        return null;
    }
}

// Utility functions
function validateAllSteps() {
    return pdfFile && idImage && selfieImage && deviceInfo;
}

function generateSecureHash(input = '') {
    const data = input + Date.now() + Math.random();
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
        const char = data.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16).padStart(8, '0') + 
           Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15);
}

// Error handling
window.addEventListener('error', function(event) {
    console.error('Application error:', event.error);
});

// Cleanup on page unload
window.addEventListener('beforeunload', function() {
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
    }
});
