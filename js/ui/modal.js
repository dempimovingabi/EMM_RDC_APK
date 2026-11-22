// js/ui/modal.js
// Gestionnaire de fenêtres modales — EMM RD CONGO

function getModalRoot() {
  return document.getElementById('app-modal-root');
}

export function closeModal() {
  const root = getModalRoot();
  if (!root) return;
  root.innerHTML = '';
  root.classList.remove('open');
  root.setAttribute('aria-hidden', 'true');
}

export function openModal({ title = '', content = '', footer = '', onMount = null } = {}) {
  const root = getModalRoot();
  if (!root) return;

  root.innerHTML = `
    <div class="modal-backdrop" data-modal-close="true">
      <div class="modal-dialog" role="dialog" aria-modal="true" aria-label="${title}">
        <div class="modal-header">
          <h3 class="modal-title">${title}</h3>
          <button type="button" class="btn-icon modal-close" data-modal-close="true" aria-label="Fermer">✕</button>
        </div>
        <div class="modal-body">${content}</div>
        ${footer ? `<div class="modal-footer">${footer}</div>` : ''}
      </div>
    </div>
  `;

  root.classList.add('open');
  root.setAttribute('aria-hidden', 'false');

  root.querySelectorAll('[data-modal-close="true"]').forEach((el) => {
    el.addEventListener('click', (e) => {
      if (e.target === el) {
        closeModal();
      }
    });
  });

  if (typeof onMount === 'function') {
    onMount(root.querySelector('.modal-dialog'), closeModal);
  }
}
