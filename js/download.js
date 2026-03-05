/* ===================================
   QRForge — Download / Export Logic
   =================================== */

// --- Download as PNG ---
function downloadPNG() {
    if (!currentData) {
        showToast('Generate a QR code first', 'error');
        return;
    }

    const options = getQROptions();
    options.data = currentData;
    if (logoImage) options.image = logoImage;

    const exportQR = new QRCodeStyling(options);
    exportQR.download({
        name: `qrforge-${currentTab}-${Date.now()}`,
        extension: 'png',
    });

    showToast('PNG downloaded!', 'success');
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

    const exportQR = new QRCodeStyling(options);
    exportQR.download({
        name: `qrforge-${currentTab}-${Date.now()}`,
        extension: 'svg',
    });

    showToast('SVG downloaded!', 'success');
}

// --- Download as PDF ---
function downloadPDF() {
    if (!currentData) {
        showToast('Generate a QR code first', 'error');
        return;
    }

    const options = getQROptions();
    options.data = currentData;
    if (logoImage) options.image = logoImage;

    const exportQR = new QRCodeStyling(options);

    exportQR.getRawData('png').then(blob => {
        const reader = new FileReader();
        reader.onload = () => {
            const imgData = reader.result;

            const { jsPDF } = window.jspdf;
            const size = parseInt(document.getElementById('custom-size').value);

            // Create a PDF that fits the QR code. Use mm units.
            // 1 inch = 25.4mm, 96 DPI for screen
            const pdfSizeMM = Math.min(200, size * 25.4 / 96); // Max 200mm
            const margin = 15;
            const totalSize = pdfSizeMM + margin * 2;

            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: [totalSize, totalSize + 20],
            });

            // Add title
            pdf.setFontSize(14);
            pdf.setFont('helvetica', 'bold');
            pdf.text('QRForge', margin, margin - 2);

            pdf.setFontSize(8);
            pdf.setFont('helvetica', 'normal');
            pdf.setTextColor(128, 128, 128);
            pdf.text(`Type: ${currentTab.toUpperCase()} | Generated: ${new Date().toLocaleDateString()}`, margin, margin + 3);

            // Add QR image
            pdf.addImage(imgData, 'PNG', margin, margin + 8, pdfSizeMM, pdfSizeMM);

            // Add data text below (truncated)
            const displayData = currentData.length > 80 ? currentData.substring(0, 80) + '...' : currentData;
            pdf.setFontSize(7);
            pdf.setTextColor(100, 100, 100);
            pdf.text(`Data: ${displayData}`, margin, margin + pdfSizeMM + 14);

            pdf.save(`qrforge-${currentTab}-${Date.now()}.pdf`);
            showToast('PDF downloaded!', 'success');
        };
        reader.readAsDataURL(blob);
    }).catch(() => {
        showToast('PDF export failed', 'error');
    });
}

// --- Utility: Generate a QR blob for bulk export ---
async function generateQRBlob(data, format = 'png') {
    const options = getQROptions();
    options.data = data;
    if (logoImage) options.image = logoImage;

    const qr = new QRCodeStyling(options);
    return qr.getRawData(format);
}
