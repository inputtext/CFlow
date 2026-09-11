/* Isolated interaction for the landing-page capability cards. */
(() => {
  const init = () => {
    const landing = document.querySelector('.landing')
    const section = landing?.querySelector('.scene--capabilities')
    const cards = section ? [...section.querySelectorAll('.capability')] : []
    if (!section || !cards.length || section.dataset.capabilityCardsReady === 'true') return !!section
    section.dataset.capabilityCardsReady = 'true'

    const details = {
      VARIABLES: { label: 'MEMORY SNAPSHOT', title: 'VALUES HAVE A PLACE.', text: 'Watch each variable appear, change, and persist as execution moves through the program.', state: 'x → 10', meta: 'STATE / 01 ACTIVE' },
      CONDITIONS: { label: 'BRANCH DECISION', title: 'SEE WHY A PATH WINS.', text: 'A condition becomes a visible decision instead of a line you have to mentally simulate.', state: 'x > 5 → TRUE', meta: 'BRANCH / TAKEN' },
      LOOPS: { label: 'ITERATION TRACE', title: 'FOLLOW EVERY TURN.', text: 'Each loop pass becomes part of the trace, making repeated state changes easy to follow.', state: '0 → 1 → 2 → 3 → …', meta: 'LOOP / STEP 04' },
      FUNCTIONS: { label: 'CALL STACK', title: 'SEE THE PROGRAM MOVE.', text: 'Follow calls into functions and watch the return value travel back to the caller.', state: 'main() → calculate()', meta: 'STACK / ACTIVE' },
    }

    const system = section.querySelector('.capability-system')
    const core = system?.querySelector('.capability-system__core')
    const leftCard = system?.querySelector('.capability-system__card:first-child')
    const rightCard = system?.querySelector('.capability-system__card:last-child')
    const original = system ? system.innerHTML : ''

    const activate = (card, index) => {
      const title = card.querySelector('strong')?.textContent?.trim()
      const item = details[title]
      if (!item || !system) return

      cards.forEach((node) => node.classList.remove('is-selected'))
      card.classList.add('is-selected')
      section.style.setProperty('--capability-index', String(index))

      if (core) {
        core.innerHTML = `<span>C·FLOW</span><b>0${index + 1}</b>`
      }
      if (leftCard) {
        leftCard.innerHTML = `<strong>${item.label}</strong><code>${item.state}</code>`
      }
      if (rightCard) {
        rightCard.innerHTML = `<strong>${item.meta}</strong><code>${item.text}</code>`
      }
    }

    const reset = () => {
      cards.forEach((node) => node.classList.remove('is-selected'))
      section.style.removeProperty('--capability-index')
      if (system) system.innerHTML = original
    }

    cards.forEach((card, index) => {
      card.setAttribute('tabindex', '0')
      card.setAttribute('role', 'button')
      card.setAttribute('aria-label', `Explore ${card.querySelector('strong')?.textContent?.trim() || 'capability'}`)
      card.addEventListener('click', () => activate(card, index))
      card.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          activate(card, index)
        }
      })
    })

    section.addEventListener('mouseleave', reset)
    section.addEventListener('focusout', (event) => {
      if (!section.contains(event.relatedTarget)) reset()
    })

    return true
  }

  const boot = () => {
    if (init()) return
    requestAnimationFrame(boot)
  }
  boot()
})()
