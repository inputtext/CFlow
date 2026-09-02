/* Tiny, isolated enhancement for the landing-page hero editor. */
(() => {
  const init = () => {
    const editor = document.querySelector('.hero-code')
    if (!editor || editor.dataset.heroEditorReady === 'true') return
    editor.dataset.heroEditorReady = 'true'

    editor.querySelectorAll('.hero-code__line code').forEach((code) => {
      code.setAttribute('contenteditable', 'true')
      code.setAttribute('spellcheck', 'false')
      code.setAttribute('role', 'textbox')
      code.setAttribute('aria-label', 'Editable code line')
      code.classList.add('hero-code__editable')
    })

    editor.addEventListener('focusin', (event) => {
      const code = event.target.closest('.hero-code__editable')
      if (code) code.classList.add('is-editing')
    })

    editor.addEventListener('focusout', (event) => {
      const code = event.target.closest('.hero-code__editable')
      if (code) code.classList.remove('is-editing')
    })
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true })
  } else {
    init()
  }
})()
