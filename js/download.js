/* ===================================
   QRForge — Download / Export Logic
   =================================== */

// --- Helper: composite QR + label onto a single canvas ---
async function compositeQRWithLabel(format = 'png') {
    const options = getQROptions();
    options.data = currentData;
    if (logoImage) options.image = logoImage;

    const label = getLabelText();
    const qrSize = options.width;

    // If no label, just return the raw blob directly
    if (!label) {
        const qr = new QRCodeStyling(options);
        return qr.getRawData(format);
    }

    // Generate QR blob first
    const qr = new QRCodeStyling(options);
    const qrBlob = await qr.getRawData('png');

    // Create a composite canvas with the label below
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            const labelHeight = Math.round(qrSize * 0.08);
            const fontSize = Math.round(qrSize * 0.035);
            const totalHeight = qrSize + labelHeight;
            const bgColor = document.getElementById('custom-bg-color').value;

            const canvas = document.createElement('canvas');
            canvas.width = qrSize;
            canvas.height = totalHeight;
            const ctx = canvas.getContext('2d');

            // Fill background
            ctx.fillStyle = bgColor;
            ctx.fillRect(0, 0, qrSize, totalHeight);

            // Draw QR code
            ctx.drawImage(img, 0, 0, qrSize, qrSize);

            // Draw label text
            ctx.fillStyle = document.getElementById('custom-fg-color').value;
            ctx.font = `600 ${fontSize}px Inter, -apple-system, sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(label, qrSize / 2, qrSize + labelHeight / 2, qrSize - 20);

            canvas.toBlob((blob) => resolve(blob), 'image/png');
        };
        img.src = URL.createObjectURL(qrBlob);
    });
}

// --- Download as PNG ---
async function downloadPNG() {
    if (!currentData) {
        showToast('Generate a QR code first', 'error');
        return;
    }

    const label = getLabelText();

    // If no label, use built-in download (faster)
    if (!label) {
        const options = getQROptions();
        options.data = currentData;
        if (logoImage) options.image = logoImage;
        const exportQR = new QRCodeStyling(options);
        exportQR.download({
            name: `qrforge-${currentTab}-${Date.now()}`,
            extension: 'png',
        });
        showToast('PNG downloaded!', 'success');
        return;
    }

    // With label: composite
    try {
        const blob = await compositeQRWithLabel('png');
        saveAs(blob, `qrforge-${currentTab}-${Date.now()}.png`);
        showToast('PNG downloaded!', 'success');
    } catch (e) {
        showToast('PNG export failed', 'error');
    }
}

// --- Download as SVG ---
function downloadSVG() {
    if (!currentData) {
        showToast('Generate a QR code first', 'error');
        return;
    }

    const options = getQROptions();
    options.data = currentData;
    options.type = 'svg';
    if (logoImage) options.image = logoImage;

    const label = getLabelText();

    if (!label) {
        // No label — use built-in download
        const exportQR = new QRCodeStyling(options);
        exportQR.download({
            name: `qrforge-${currentTab}-${Date.now()}`,
            extension: 'svg',
        });
        showToast('SVG downloaded!', 'success');
        return;
    }

    // With label — get raw SVG and append text
    const exportQR = new QRCodeStyling(options);
    exportQR.getRawData('svg').then(blob => {
        const reader = new FileReader();
        reader.onload = () => {
            let svgText = reader.result;
            const size = options.width;
            const labelHeight = Math.round(size * 0.08);
            const fontSize = Math.round(size * 0.035);
            const fgColor = document.getElementById('custom-fg-color').value;
            const bgColor = document.getElementById('custom-bg-color').value;

            // Extend SVG viewBox and add label
            svgText = svgText.replace(
                /viewBox="0 0 (\d+) (\d+)"/,
                `viewBox="0 0 $1 ${size + labelHeight}"`
            );
            svgText = svgText.replace(
                /height="(\d+)"/,
                `height="${size + labelHeight}"`
            );

            // Insert label text before closing </svg>
            const labelSvg = `<rect x="0" y="${size}" width="${size}" height="${labelHeight}" fill="${bgColor}"/>` +
                `<text x="${size / 2}" y="${size + labelHeight / 2}" text-anchor="middle" dominant-baseline="central" ` +
                `fill="${fgColor}" font-family="Inter, sans-serif" font-weight="600" font-size="${fontSize}">${label}</text>`;

            svgText = svgText.replace('</svg>', `${labelSvg}</svg>`);

            const svgBlob = new Blob([svgText], { type: 'image/svg+xml' });
            saveAs(svgBlob, `qrforge-${currentTab}-${Date.now()}.svg`);
            showToast('SVG downloaded!', 'success');
        };
        reader.readAsText(blob);
    }).catch(() => {
        showToast('SVG export failed', 'error');
    });
}

// --- Download as PDF ---
async function downloadPDF() {
    if (!currentData) {
        showToast('Generate a QR code first', 'error');
        return;
    }

    try {
        const blob = await compositeQRWithLabel('png');
        const reader = new FileReader();
        reader.onload = () => {
            const imgData = reader.result;
            const label = getLabelText();

            const { jsPDF } = window.jspdf;
            const size = parseInt(document.getElementById('custom-size').value);

            // Create a PDF that fits the QR code. Use mm units.
            const pdfSizeMM = Math.min(200, size * 25.4 / 96);
            const margin = 15;
            const totalSize = pdfSizeMM + margin * 2;

            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: [totalSize, totalSize + 25],
            });

            // Add title
            pdf.setFontSize(14);
            pdf.setFont('helvetica', 'bold');
            pdf.text('QRForge', margin, margin - 2);

            pdf.setFontSize(8);
            pdf.setFont('helvetica', 'normal');
            pdf.setTextColor(128, 128, 128);
            pdf.text(`Type: ${currentTab.toUpperCase()} | Generated: ${new Date().toLocaleDateString()}`, margin, margin + 3);

            // Compute image height (includes label if present)
            const imgRatio = label ? 1.08 : 1;
            const imgHeight = pdfSizeMM * imgRatio;

            // Add QR image (with label baked in)
            pdf.addImage(imgData, 'PNG', margin, margin + 8, pdfSizeMM, imgHeight);

            // Add data text below
            const displayData = currentData.length > 80 ? currentData.substring(0, 80) + '...' : currentData;
            pdf.setFontSize(7);
            pdf.setTextColor(100, 100, 100);
            pdf.text(`Data: ${displayData}`, margin, margin + imgHeight + 14);

            pdf.save(`qrforge-${currentTab}-${Date.now()}.pdf`);
            showToast('PDF downloaded!', 'success');
        };
        reader.readAsDataURL(blob);
    } catch (e) {
        showToast('PDF export failed', 'error');
    }
}

// --- Utility: Generate a QR blob for bulk export ---
async function generateQRBlob(data, format = 'png') {
    const options = getQROptions();
    options.data = data;
    if (logoImage) options.image = logoImage;

    const qr = new QRCodeStyling(options);
    return qr.getRawData(format);
}
