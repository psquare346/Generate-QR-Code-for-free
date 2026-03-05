/* ===================================
   QRForge — Bulk Generation Logic
   =================================== */

let bulkBlobs = [];

// --- Handle CSV Upload ---
function handleBulkCSV(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        const content = e.target.result;
        const textarea = document.getElementById('bulk-input');

        // Parse CSV — take first column of each row
        const lines = content.split(/\r?\n/)
            .map(line => {
                // Handle quoted CSV fields
                const match = line.match(/^"?([^",]*)"?/);
                return match ? match[1].trim() : line.trim();
            })
            .filter(line => line.length > 0);

        textarea.value = lines.join('\n');

        // Update count
        document.getElementById('bulk-count').textContent = `${lines.length} ${lines.length === 1 ? 'entry' : 'entries'}`;

        showToast(`Loaded ${lines.length} entries from CSV`, 'success');
    };
    reader.readAsText(file);
}

// --- Generate All QR Codes ---
async function generateBulk() {
    const textarea = document.getElementById('bulk-input');
    const lines = textarea.value.split('\n').filter(l => l.trim());

    if (lines.length === 0) {
        showToast('Please enter at least one item', 'error');
        return;
    }

    if (lines.length > 500) {
        showToast('Maximum 500 entries at a time', 'error');
        return;
    }

    const generateBtn = document.getElementById('bulk-generate-btn');
    const downloadBtn = document.getElementById('bulk-download-btn');
    const progressDiv = document.getElementById('bulk-progress');
    const progressFill = document.getElementById('progress-fill');
    const progressText = document.getElementById('progress-text');

    // UI state
    generateBtn.disabled = true;
    generateBtn.textContent = '⏳ Generating...';
    downloadBtn.disabled = true;
    progressDiv.style.display = 'block';
    progressFill.style.width = '0%';
    bulkBlobs = [];

    try {
        for (let i = 0; i < lines.length; i++) {
            const data = lines[i].trim();
            if (!data) continue;

            const blob = await generateQRBlob(data, 'png');
            bulkBlobs.push({ data, blob, index: i + 1 });

            // Update progress
            const pct = Math.round(((i + 1) / lines.length) * 100);
            progressFill.style.width = `${pct}%`;
            progressText.textContent = `Generated ${i + 1} of ${lines.length} (${pct}%)`;

            // Small delay to keep UI responsive
            if (i % 5 === 0) {
                await new Promise(r => setTimeout(r, 10));
            }
        }

        showToast(`Generated ${bulkBlobs.length} QR codes!`, 'success');
        downloadBtn.disabled = false;

    } catch (err) {
        showToast(`Error: ${err.message}`, 'error');
    } finally {
        generateBtn.disabled = false;
        generateBtn.textContent = '⚡ Generate All';
    }
}

// --- Download All as ZIP ---
async function downloadBulkZip() {
    if (bulkBlobs.length === 0) {
        showToast('Generate QR codes first', 'error');
        return;
    }

    const downloadBtn = document.getElementById('bulk-download-btn');
    downloadBtn.disabled = true;
    downloadBtn.textContent = '📦 Creating ZIP...';

    try {
        const zip = new JSZip();
        const folder = zip.folder('qrforge-bulk');

        for (const item of bulkBlobs) {
            // Create a safe filename from the data
            let safeName = item.data
                .replace(/[^a-zA-Z0-9.-]/g, '_') // Replace special chars
                .substring(0, 50); // Limit length

            if (!safeName) safeName = `qr_${item.index}`;

            folder.file(`${String(item.index).padStart(3, '0')}_${safeName}.png`, item.blob);
        }

        const content = await zip.generateAsync({
            type: 'blob',
            compression: 'DEFLATE',
            compressionOptions: { level: 6 },
        });

        saveAs(content, `qrforge-bulk-${Date.now()}.zip`);
        showToast('ZIP downloaded!', 'success');

    } catch (err) {
        showToast(`ZIP error: ${err.message}`, 'error');
    } finally {
        downloadBtn.disabled = false;
        downloadBtn.textContent = '📦 Download ZIP';
    }
}
