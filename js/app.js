/* ===================================
   QRForge — Core Application Logic
   =================================== */

// --- State ---
let currentTab = 'url';
let qrCode = null;
let currentData = '';
let logoImage = null;

// --- Tab Switching ---
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const tab = btn.dataset.tab;
    if (tab === currentTab) return;

    // Update button states
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    // Update content visibility
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    document.getElementById(`tab-${tab}`).classList.add('active');

    currentTab = tab;
  });
});

// --- Navbar scroll effect ---
window.addEventListener('scroll', () => {
  const navbar = document.getElementById('navbar');
  if (window.scrollY > 50) {
    navbar.classList.add('scrolled');
  } else {
    navbar.classList.remove('scrolled');
  }
});

// --- Smooth scroll for anchor links ---
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function (e) {
    e.preventDefault();
    const target = document.querySelector(this.getAttribute('href'));
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
});

// --- Build QR Data String ---
function getQRData() {
  switch (currentTab) {
    case 'url': {
      const url = document.getElementById('input-url').value.trim();
      if (!url) { showToast('Please enter a URL', 'error'); return null; }
      return url;
    }
    case 'text': {
      const text = document.getElementById('input-text').value.trim();
      if (!text) { showToast('Please enter some text', 'error'); return null; }
      return text;
    }
    case 'wifi': {
      const ssid = document.getElementById('input-wifi-ssid').value.trim();
      const pass = document.getElementById('input-wifi-password').value;
      const enc = document.getElementById('input-wifi-encryption').value;
      if (!ssid) { showToast('Please enter a network name', 'error'); return null; }
      // Escape special characters in SSID and password
      const escSSID = ssid.replace(/([\\;,:"])/g, '\\$1');
      const escPass = pass.replace(/([\\;,:"])/g, '\\$1');
      return `WIFI:T:${enc};S:${escSSID};P:${escPass};;`;
    }
    case 'vcard': {
      const fn = document.getElementById('input-vcard-fname').value.trim();
      const ln = document.getElementById('input-vcard-lname').value.trim();
      const org = document.getElementById('input-vcard-org').value.trim();
      const phone = document.getElementById('input-vcard-phone').value.trim();
      const email = document.getElementById('input-vcard-email').value.trim();
      const url = document.getElementById('input-vcard-url').value.trim();
      if (!fn && !ln) { showToast('Please enter at least a name', 'error'); return null; }
      let vcard = `BEGIN:VCARD\nVERSION:3.0\nN:${ln};${fn};;;\nFN:${fn} ${ln}`;
      if (org) vcard += `\nORG:${org}`;
      if (phone) vcard += `\nTEL:${phone}`;
      if (email) vcard += `\nEMAIL:${email}`;
      if (url) vcard += `\nURL:${url}`;
      vcard += `\nEND:VCARD`;
      return vcard;
    }
    case 'email': {
      const addr = document.getElementById('input-email-addr').value.trim();
      const subject = document.getElementById('input-email-subject').value.trim();
      const body = document.getElementById('input-email-body').value.trim();
      if (!addr) { showToast('Please enter an email address', 'error'); return null; }
      let mailto = `mailto:${encodeURIComponent(addr)}`;
      const params = [];
      if (subject) params.push(`subject=${encodeURIComponent(subject)}`);
      if (body) params.push(`body=${encodeURIComponent(body)}`);
      if (params.length) mailto += `?${params.join('&')}`;
      return mailto;
    }
    case 'phone': {
      const phone = document.getElementById('input-phone').value.trim();
      if (!phone) { showToast('Please enter a phone number', 'error'); return null; }
      return `tel:${phone}`;
    }
    case 'sms': {
      const phone = document.getElementById('input-sms-phone').value.trim();
      const msg = document.getElementById('input-sms-message').value.trim();
      if (!phone) { showToast('Please enter a phone number', 'error'); return null; }
      let sms = `smsto:${phone}`;
      if (msg) sms += `:${msg}`;
      return sms;
    }
    case 'calendar': {
      const title = document.getElementById('input-cal-title').value.trim();
      const start = document.getElementById('input-cal-start').value;
      const end = document.getElementById('input-cal-end').value;
      const location = document.getElementById('input-cal-location').value.trim();
      const desc = document.getElementById('input-cal-desc').value.trim();
      if (!title) { showToast('Please enter an event title', 'error'); return null; }
      if (!start) { showToast('Please enter a start date', 'error'); return null; }

      const formatDT = (dt) => {
        return dt.replace(/[-:]/g, '').replace('T', 'T') + '00';
      };

      let vevent = `BEGIN:VCALENDAR\nVERSION:2.0\nBEGIN:VEVENT\nSUMMARY:${title}`;
      vevent += `\nDTSTART:${formatDT(start)}`;
      if (end) vevent += `\nDTEND:${formatDT(end)}`;
      if (location) vevent += `\nLOCATION:${location}`;
      if (desc) vevent += `\nDESCRIPTION:${desc}`;
      vevent += `\nEND:VEVENT\nEND:VCALENDAR`;
      return vevent;
    }
    default:
      return null;
  }
}

// --- Get current customization options ---
function getQROptions() {
  return {
    width: parseInt(document.getElementById('custom-size').value),
    height: parseInt(document.getElementById('custom-size').value),
    type: 'canvas',
    dotsOptions: {
      color: document.getElementById('custom-fg-color').value,
      type: document.getElementById('custom-dot-style').value,
    },
    backgroundOptions: {
      color: document.getElementById('custom-bg-color').value,
    },
    cornersSquareOptions: {
      type: document.getElementById('custom-corner-style').value,
      color: document.getElementById('custom-fg-color').value,
    },
    cornersDotOptions: {
      type: document.getElementById('custom-corner-style').value === 'extra-rounded' ? 'dot' : document.getElementById('custom-corner-style').value,
      color: document.getElementById('custom-fg-color').value,
    },
    qrOptions: {
      errorCorrectionLevel: document.getElementById('custom-error-correction').value,
    },
    imageOptions: {
      crossOrigin: 'anonymous',
      margin: 8,
      imageSize: 0.35,
    },
  };
}

// --- Generate QR Code ---
function generateQR() {
  const data = getQRData();
  if (!data) return;

  currentData = data;

  const previewBox = document.getElementById('qr-preview-box');
  const placeholder = document.getElementById('qr-placeholder');
  const downloadActions = document.getElementById('download-actions');

  // Clear previous
  if (qrCode) {
    const existing = previewBox.querySelector('canvas, img');
    if (existing) existing.remove();
  }
  placeholder.style.display = 'none';

  const options = getQROptions();
  options.data = data;

  // Add logo if set
  if (logoImage) {
    options.image = logoImage;
  }

  // For preview, use fixed 248px size
  const previewOptions = { ...options };
  previewOptions.width = 248;
  previewOptions.height = 248;

  qrCode = new QRCodeStyling(previewOptions);
  qrCode.append(previewBox);

  // Show download buttons
  downloadActions.style.display = 'flex';

  showToast('QR code generated!', 'success');
}

// --- Update QR style live ---
function updateQRStyle() {
  // Update hex displays
  document.getElementById('fg-hex').textContent = document.getElementById('custom-fg-color').value;
  document.getElementById('bg-hex').textContent = document.getElementById('custom-bg-color').value;

  // If a QR code exists, regenerate it
  if (currentData) {
    generateQR();
  }
}

// --- Customization toggle ---
function toggleCustomization() {
  const toggle = document.getElementById('custom-toggle');
  const panel = document.getElementById('custom-panel');
  toggle.classList.toggle('open');
  panel.classList.toggle('open');
}

// --- Logo handling ---
function handleLogoUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  if (!file.type.startsWith('image/')) {
    showToast('Please upload an image file', 'error');
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    logoImage = e.target.result;

    // Show preview
    document.getElementById('logo-upload-area').style.display = 'none';
    const preview = document.getElementById('logo-preview');
    preview.style.display = 'flex';
    document.getElementById('logo-preview-img').src = logoImage;
    document.getElementById('logo-name').textContent = file.name;

    // Bump error correction to H for logos
    document.getElementById('custom-error-correction').value = 'H';

    // Regenerate if QR exists
    if (currentData) generateQR();

    showToast('Logo added! Error correction set to High.', 'success');
  };
  reader.readAsDataURL(file);
}

function removeLogo() {
  logoImage = null;
  document.getElementById('logo-upload-area').style.display = '';
  document.getElementById('logo-preview').style.display = 'none';
  document.getElementById('logo-file-input').value = '';
  document.getElementById('custom-error-correction').value = 'M';

  if (currentData) generateQR();
  showToast('Logo removed', 'success');
}

// --- Toast notifications ---
function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <span>${type === 'success' ? '✅' : '⚠️'}</span>
    <span>${message}</span>
  `;
  container.appendChild(toast);

  // Auto-remove after animation
  setTimeout(() => {
    toast.remove();
  }, 3000);
}

// --- Bulk textarea line counter ---
const bulkInput = document.getElementById('bulk-input');
if (bulkInput) {
  bulkInput.addEventListener('input', () => {
    const lines = bulkInput.value.split('\n').filter(l => l.trim()).length;
    document.getElementById('bulk-count').textContent = `${lines} ${lines === 1 ? 'entry' : 'entries'}`;
  });
}

// --- Enter key to generate ---
document.querySelectorAll('.input-panel input').forEach(input => {
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      generateQR();
    }
  });
});
