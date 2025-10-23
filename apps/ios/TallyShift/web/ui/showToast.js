export function showToast(
  message = 'Saved',
  duration = 2200,
  type = 'success',
) {
  const el = document.createElement('div')
  el.className = `toast toast-${type}`
  el.textContent = message
  document.body.appendChild(el)
  // Force reflow so CSS transitions apply
  window.getComputedStyle(el).opacity
  el.classList.add('show')
  setTimeout(() => {
    el.classList.remove('show')
    setTimeout(() => el.remove(), 300)
  }, duration)
}
