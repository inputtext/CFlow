/* Landing-only keyboard shortcuts. Never intercepts typing in editable controls. */
(() => {
  const init = () => {
    const landing = document.querySelector('.landing')
    if (!landing || landing.dataset.keyboardShortcutsReady === 'true') return !!landing
    landing.dataset.keyboardShortcutsReady = 'true'

    const hint = document.createElement('div')
    hint.className = 'landing-keyboard-hint'
    hint.innerHTML = '<span>KEYBOARD</span><kbd>J</kbd><b>NEXT</b><kbd>K</kbd><b>PREV</b><kbd>G</kbd><b>START</b>'
    landing.appendChild(hint)

    const targets = ['.hero', '#problem', '#engine', '.execution', '.scene--capabilities', '#philosophy', '.scene--preview', '#cta', '.landing-footer']
    const getIndex = () => {
      const center = window.scrollY + window.innerHeight * .45
      let active = 0
      targets.forEach((selector, index) => {
        const element = document.querySelector(selector)
        if (element && element.offsetTop <= center) active = index
      })
      return active
    }

    const go = (index) => {
      const element = document.querySelector(targets[Math.max(0, Math.min(index, targets.length - 1))])
      element?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }

    const onKeyDown = (event) => {
      const target = event.target
      const editable = target instanceof HTMLElement && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))
      if (editable || event.altKey || event.ctrlKey || event.metaKey) return
      if (event.key.toLowerCase() === 'j') { event.preventDefault(); go(getIndex() + 1) }
      if (event.key.toLowerCase() === 'k') { event.preventDefault(); go(getIndex() - 1) }
      if (event.key.toLowerCase() === 'g') { event.preventDefault(); go(0) }
    }

    document.addEventListener('keydown', onKeyDown)
    return true
  }

  const boot = () => {
    if (init()) return
    requestAnimationFrame(boot)
  }
  boot()
})()
