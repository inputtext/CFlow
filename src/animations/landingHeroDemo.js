/*
 * Landing-only Hero demo enhancement.
 * Reads the existing editable Hero code and mirrors simple integer assignments
 * into the existing memory/output UI. It never touches the workspace editor.
 */
(() => {
  const init = () => {
    const editor = document.querySelector('.hero-code')
    if (!editor || editor.dataset.heroDemoReady === 'true') return !!editor

    const lines = [...editor.querySelectorAll('.hero-code__line')]
    const code = lines.map((line) => line.querySelector('code')).filter(Boolean)
    const memory = [...editor.querySelectorAll('.hero-memory span')]
    const output = editor.querySelector('.hero-code__pulse')

    if (code.length < 3 || memory.length < 3 || !output) return false
    editor.dataset.heroDemoReady = 'true'

    const numberFromLine = (text, name) => {
      const match = text.match(new RegExp(`\\b${name}\\s*=\\s*(-?\\d+)`))
      return match ? Number(match[1]) : null
    }

    const update = () => {
      const x = numberFromLine(code[0].textContent, 'x')
      const y = numberFromLine(code[1].textContent, 'y')
      const expression = code[2].textContent.match(/=\s*x\s*\+\s*y/) || code[2].textContent.match(/=\s*y\s*\+\s*x/)
      const sum = expression && x !== null && y !== null ? x + y : null

      if (x !== null) memory[0].querySelector('b').textContent = x
      if (y !== null) memory[1].querySelector('b').textContent = y
      if (sum !== null) {
        memory[2].querySelector('b').textContent = sum
        output.textContent = `→ ${sum}`
      } else {
        output.textContent = '→ —'
      }

      lines.forEach((line) => line.classList.remove('is-demo-active'))
      const active = document.activeElement?.closest('.hero-code__line')
      if (active) active.classList.add('is-demo-active')
    }

    code.forEach((item) => item.addEventListener('input', update))
    editor.addEventListener('focusin', (event) => {
      const line = event.target.closest('.hero-code__line')
      if (line) line.classList.add('is-demo-active')
    })
    editor.addEventListener('focusout', () => {
      window.requestAnimationFrame(() => {
        lines.forEach((line) => line.classList.remove('is-demo-active'))
      })
    })

    update()
    return true
  }

  const boot = () => {
    if (init()) return
    window.requestAnimationFrame(boot)
  }

  boot()
})()
