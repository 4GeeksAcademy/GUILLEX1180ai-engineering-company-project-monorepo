const form = document.querySelector('#application-form');

if (form) {
  const fields = {
    company: document.querySelector('#company'),
    contact: document.querySelector('#contact'),
    email: document.querySelector('#email'),
    phone: document.querySelector('#phone'),
    website: document.querySelector('#website'),
    country: document.querySelector('#country'),
    product: document.querySelector('#product'),
    volume: document.querySelector('#volume'),
    comments: document.querySelector('#comments'),
    privacy: document.querySelector('#privacy')
  };
  const commentsCount = document.querySelector('#comments-count');
  const volumeWarning = document.querySelector('#volume-warning');
  const successMessage = document.querySelector('#form-success');
  const messages = {
    company: 'El nombre de la empresa debe tener al menos 2 caracteres',
    contact: 'Ingresa nombre y apellido del contacto',
    email: 'Ingresa un email corporativo válido (ejemplo: nombre@empresa.com)',
    phone: 'El teléfono debe incluir código de país (ejemplo: +1 213 555 0147)',
    website: 'Si incluyes sitio web, debe ser una URL válida',
    country: 'Selecciona el país de operación principal',
    product: 'Selecciona el tipo de producto que manejas',
    volume: 'Selecciona el volumen mensual estimado',
    services: 'Selecciona al menos un servicio de interés',
    'current-3pl': 'Indica si actualmente trabajas con otro proveedor logístico',
    comments: 'Los comentarios no pueden exceder 500 caracteres',
    privacy: 'Debes aceptar la política de privacidad para continuar'
  };

  const validators = {
    company: () => fields.company.value.trim().length >= 2,
    contact: () => fields.contact.value.trim().split(/\s+/).filter(Boolean).length >= 2,
    email: () => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email.value.trim()),
    phone: () => /^\+\d{1,3}(?:[ -]?\d){7,14}$/.test(fields.phone.value.trim()),
    website: () => isValidWebsite(fields.website.value.trim()),
    country: () => Boolean(fields.country.value),
    product: () => Boolean(fields.product.value),
    volume: () => Boolean(fields.volume.value),
    services: () => form.querySelectorAll('input[name="services"]:checked').length > 0,
    'current-3pl': () => Boolean(form.querySelector('input[name="current-3pl"]:checked')),
    comments: () => fields.comments.value.length <= 500,
    privacy: () => fields.privacy.checked
  };

  function controlsFor(name) {
    if (name === 'services') return [...form.querySelectorAll('input[name="services"]')];
    if (name === 'current-3pl') return [...form.querySelectorAll('input[name="current-3pl"]')];
    return fields[name] ? [fields[name]] : [];
  }

  function setError(name, message) {
    const error = document.querySelector(`#${name}-error`);
    if (error) error.textContent = message;
    controlsFor(name).forEach((control) => {
      control.setAttribute('aria-invalid', String(Boolean(message)));
    });
  }

  function isValidWebsite(value) {
    if (!value) return true;
    try {
      const url = new URL(value);
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
      return false;
    }
  }

  function validateField(name) {
    const passes = validators[name]();
    const message = passes
      ? ''
      : name === 'comments'
        ? `${messages.comments} (quedan ${500 - fields.comments.value.length})`
        : messages[name];
    setError(name, message);
    return passes;
  }

  function validateForm() {
    let valid = true;
    for (const name of Object.keys(validators)) {
      if (!validateField(name)) valid = false;
    }
    return valid;
  }

  function updateCommentsCount() {
    commentsCount.textContent = `${fields.comments.value.length}/500`;
  }

  function updateVolumeWarning() {
    volumeWarning.classList.toggle('hidden', fields.volume.value !== '0-100');
  }

  function validateChangedControl(event) {
    const { name } = event.target;
    if (validators[name]) validateField(name);
    if (event.target === fields.comments) updateCommentsCount();
    if (event.target === fields.volume) updateVolumeWarning();
  }

  form.addEventListener('input', validateChangedControl);
  form.addEventListener('change', validateChangedControl);
  form.addEventListener('focusout', (event) => {
    const { name } = event.target;
    if (validators[name]) validateField(name);
  });

  // Restablece los mensajes y el estado accesible después del reset nativo.
  form.addEventListener('reset', () => {
    Object.keys(validators).forEach((name) => setError(name, ''));
    successMessage.classList.add('hidden');
    volumeWarning.classList.add('hidden');
    window.setTimeout(updateCommentsCount, 0);
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    successMessage.classList.add('hidden');

    if (!validateForm()) {
      form.querySelector('[aria-invalid="true"]')?.focus();
      return;
    }

    if (fields.volume.value === '0-100' && !window.confirm(volumeWarning.textContent.trim())) {
      fields.volume.focus();
      return;
    }

    form.reset();
    successMessage.classList.remove('hidden');
    successMessage.focus();
  });
}