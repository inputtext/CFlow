/* Landing-only Problem telemetry. Presentation layer only; does not change app logic. */
(() => {
  const init = () => {
    const landing = document.querySelector('.landing')
    const problem = landing?.querySelector('#problem')
    if (!problem || problem.dataset.telemetryReady === 'true') return !!problem

    problem.dataset.telemetryReady = 'true'

    const panel = document.createElement('div')
    panel.className = 'problem-state-panel'
    panel.setAttribute('aria-hidden', 'true')
    panel.innerHTML = `
      <div class="problem-state-panel__head">
        <span>MACHINE STATE</span>
        <b><i></i> LIVE</b>
      </div>
      <div class="problem-state-panel__body">
        <div class="problem-state-panel__row"><small>LINE</small><strong>01</strong><em>ACTIVE</em></div>
        <div class="problem-state-panel__row"><small>VARIABLE</small><strong>x</strong><em>10</em></div>
        <div class="problem-state-panel__row"><small>CONDITION</small><strong>x &gt; 5</strong><em>TRUE</em></div>
        <div class="problem-state-panel__row"><small>OUTPUT</small><strong>return x</strong><em>10</em></div>
      </div>
      <div class="problem-state-panel__trace"><span></span><span></span><span></span><span></span><span></span></div>
      <div class="problem-state-panel__foot"><span>PROGRAM STATE</span><b>TRACE 001</b></div>
    `
    problem.appendChild(panel)
    return true
  }

  const boot = () => {
    if (init()) return
    requestAnimationFrame(boot)
  }

  boot()
})()
