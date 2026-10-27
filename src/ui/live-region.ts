/** Visually hidden polite live region. Returns a function that announces a message. */
export function createLiveRegion(parent: HTMLElement): (message: string) => void {
  const el = document.createElement('div')
  el.setAttribute('role', 'status')
  el.setAttribute('aria-live', 'polite')
  el.setAttribute('aria-atomic', 'true')
  el.className = 'visually-hidden'
  Object.assign(el.style, {
    position: 'absolute',
    width: '1px',
    height: '1px',
    overflow: 'hidden',
    clip: 'rect(0 0 0 0)',
    whiteSpace: 'nowrap',
  })
  parent.append(el)
  return (message) => {
    el.textContent = message
  }
}
