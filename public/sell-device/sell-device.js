/* Sell Your Device — client-side validation + secure submission */

(function () {
  const form = document.getElementById('sellDeviceForm');
  if (!form) return;

  const errorEl = document.getElementById('sellDeviceError');
  const successEl = document.getElementById('sellDeviceSuccess');
  const submitBtn = document.getElementById('sellDeviceSubmit');

  const MAX_FILES = 5;
  const MAX_FILE_BYTES = 5 * 1024 * 1024;
  const ALLOWED_MIME = new Set(['image/jpeg', 'image/png']);
  const WHATSAPP_NUMBER = '4915679652076';

  function setMessage(el, message) {
    if (!el) return;
    if (!message) {
      el.textContent = '';
      el.setAttribute('hidden', '');
      return;
    }
    el.textContent = message;
    el.removeAttribute('hidden');
  }

  function sanitizeText(value, maxLen) {
    const str = String(value || '')
      .replace(/[\u0000-\u001F\u007F]/g, ' ') // control chars
      .replace(/[<>]/g, '') // basic HTML tag stripping
      .replace(/\s+/g, ' ')
      .trim();
    if (!maxLen) return str;
    return str.length > maxLen ? str.slice(0, maxLen) : str;
  }

  function validateFiles(fileList) {
    const files = Array.from(fileList || []);
    if (files.length > MAX_FILES) return `Maximum ${MAX_FILES} images allowed.`;

    // Photos are optional (WhatsApp supports sending images directly).
    if (files.length === 0) return '';

    for (const f of files) {
      if (!ALLOWED_MIME.has(String(f.type || '').toLowerCase())) {
        return 'Only JPG, JPEG, and PNG images are allowed.';
      }
      if (f.size > MAX_FILE_BYTES) {
        return 'One or more images exceed the 5MB limit.';
      }
    }

    return '';
  }

  function validateForm() {
    const deviceType = form.deviceType?.value;
    const model = form.model?.value;
    const storage = form.storage?.value;
    const condition = form.condition?.value;
    const batteryHealth = form.batteryHealth?.value;
    const customerName = form.customerName?.value;
    const whatsAppNumber = form.whatsAppNumber?.value;
    const emailAddress = form.emailAddress?.value;

    if (!deviceType) return 'Device Type is required.';
    if (!model) return 'Model is required.';
    if (!storage) return 'Storage is required.';
    if (!condition) return 'Condition is required.';
    if (!batteryHealth) return 'Battery Health is required.';
    if (!customerName) return 'Customer Name is required.';
    if (!whatsAppNumber) return 'WhatsApp Number is required.';
    if (!emailAddress) return 'Email Address is required.';

    const filesError = validateFiles(form.photos?.files);
    if (filesError) return filesError;

    return '';
  }

  function buildWhatsAppLink(message) {
    const encoded = encodeURIComponent(message);
    return `https://wa.me/${WHATSAPP_NUMBER}?text=${encoded}`;
  }

  function openWhatsApp(message) {
    const href = buildWhatsAppLink(message);
    try {
      const w = window.open(href, '_blank', 'noopener,noreferrer');
      if (w) return;
    } catch {
      // ignore
    }
    window.location.href = href;
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    setMessage(errorEl, '');
    setMessage(successEl, '');

    const err = validateForm();
    if (err) {
      setMessage(errorEl, err);
      return;
    }

    const payload = {
      deviceType: sanitizeText(form.deviceType.value, 40),
      model: sanitizeText(form.model.value, 80),
      storage: sanitizeText(form.storage.value, 10),
      condition: sanitizeText(form.condition.value, 20),
      batteryHealth: sanitizeText(form.batteryHealth.value, 20),
      customerName: sanitizeText(form.customerName.value, 80),
      whatsAppNumber: sanitizeText(form.whatsAppNumber.value, 40),
      emailAddress: sanitizeText(form.emailAddress.value, 120),
    };

    const prevText = submitBtn ? submitBtn.textContent : '';
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Sending…';
    }

    try {
      const msg =
        `New Device Sell Request\n\n` +
        `Customer Name: ${payload.customerName}\n` +
        `WhatsApp Number: ${payload.whatsAppNumber}\n` +
        `Email Address: ${payload.emailAddress}\n` +
        `Device Type: ${payload.deviceType}\n` +
        `Model: ${payload.model}\n` +
        `Storage: ${payload.storage}\n` +
        `Condition: ${payload.condition}\n` +
        `Battery Health: ${payload.batteryHealth}\n\n` +
        `Photos: Please send device photos in this WhatsApp chat.`;

      openWhatsApp(msg);

      setMessage(
        successEl,
        'Thank you. Your device details have been sent. Our team will review your device and contact you within 24 hours.',
      );

      // Keep the page clean after success.
      form.reset();
    } catch (ex) {
      setMessage(errorEl, ex && ex.message ? ex.message : 'Could not open WhatsApp. Please try again.');
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = prevText || 'Send';
      }
    }
  });
})();
