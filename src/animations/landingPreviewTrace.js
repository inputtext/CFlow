/* Isolated product-preview execution trace. Landing page only. */
(() => {
  const init = () => {
    const preview = document.querySelector('.scene--preview .preview-window')
    const code = preview?.querySelector('.preview-code')
    if (!preview || !code || preview.dataset.traceReady === 'true') return !!preview
    preview.dataset.traceReady = 'true'

    const lines = [...code.childNodes].reduce((items, node) => {
      if (node.nodeType === Node.ELEMENT_NODE && node.tagName === 'SPAN') items.push(node.parentElement)
      return items
    }, [])

    const existing = [...code.querySelectorAll('span')]
    const sourceLines = existing.length >= 4 ? existing : []
    if (!sourceLines.length) return true

    const trace = document.createElement('div')
    trace.className = 'landing-preview-trace'
    trace.innerHTML = '<span class="landing-preview-trace__label">LIVE EXECUTION TRACE</span><div class="landing-preview-trace__rail"><i></i><i></i><i></i><i></i></div><span class="landing-preview-trace__state">READY / STEP 01</span>'
    preview.appendChild(trace)

    const nodes = [...preview.querySelectorAll('.preview-flow__node')]
    const railNodes = [...trace.querySelectorAll('.landing-preview-trace__rail i')]
    const state = trace.querySelector('.landing-preview-trace__state')

    const activate = (index) => {
      railNodes.forEach((node, nodeIndex) => node.classList.toggle('is-active', nodeIndex === index))
      nodes.forEach((node, nodeIndex) => node.classList.toggle('is-trace-active', nodeIndex === Math.min(index, nodes.length - 1)))
      state.textContent = ['READY / STEP 01', 'STATE / x = 10', 'RETURN / 10', 'OUTPUT / 10'][index]
    }

    railNodes.forEach((node, index) => node.addEventListener('mouseenter', () => activate(index)))
    railNodes.forEach((node, index) => node.addEventListener('focus', () => activate(index)))
    activate(0)

    return true
  }

  const boot = () => {
    if (init()) return
    requestAnimationFrame(boot)
  }
  boot()
})()
