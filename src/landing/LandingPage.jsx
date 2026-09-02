import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

import { initLandingSmoothScroll } from '../animations/landingSmoothScroll.js'
import EngineLottie from '../animations/lottie/EngineLottie.jsx'
import './landing.css'
import './landing-motion.css'
import './landing-enhancements.css'

gsap.registerPlugin(ScrollTrigger)

const codeLines = ['int x = 10;', 'int y = 20;', 'int sum = x + y;']

function HeroCode() {
  const ref = useRef(null)
  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from('.hero-code__line', { opacity: 0, x: 24, stagger: .14, duration: .7, ease: 'power3.out' })
      gsap.to('.hero-code__pulse', { y: -8, repeat: -1, yoyo: true, duration: 1.8, ease: 'sine.inOut' })
      gsap.to('.hero-code', { y: -14, rotate: -.4, repeat: -1, yoyo: true, duration: 4.5, ease: 'sine.inOut' })
    }, ref)
    return () => ctx.revert()
  }, [])
  return (
    <div className="hero-code" ref={ref} aria-label="Animated C++ example">
      <div className="window-bar"><span /><span /><span /><b>main.cpp</b></div>
      <div className="hero-code__body">
        {codeLines.map((line, index) => <div className="hero-code__line" key={line}><i>{String(index + 1).padStart(2, '0')}</i><code>{line}</code>{index === 2 && <em className="hero-code__pulse">→ 30</em>}</div>)}
      </div>
      <div className="hero-memory"><span>x <b>10</b></span><span>y <b>20</b></span><span>sum <b>30</b></span></div>
      <div className="hero-status"><span className="status-dot" /> EXECUTION LIVE <b>STEP 03 / 03</b></div>
    </div>
  )
}

function HeroFlowMap() {
  return <div className="hero-flow-map" aria-hidden="true"><span className="flow-map__node flow-map__node--one">CODE</span><span className="flow-map__line flow-map__line--one" /><span className="flow-map__node flow-map__node--two">STATE</span><span className="flow-map__line flow-map__line--two" /><span className="flow-map__node flow-map__node--three">FLOW</span></div>
}

function ProblemVisual() {
  return <div className="problem-visual" aria-hidden="true"><div className="problem-visual__bar"><span>STATIC SOURCE</span><b>→</b></div><div className="problem-visual__code"><span>int x = 10;</span><span>if (x &gt; 5)</span><span>return x;</span></div><div className="problem-visual__path" /><div className="problem-visual__tokens"><i>x</i><i>TRUE</i><i>RETURN 10</i></div></div>
}

function Engine() {
  const ref = useRef(null)
  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from('.engine-step', { opacity: 0, x: -30, stagger: .12, duration: .65, scrollTrigger: { trigger: ref.current, start: 'top 72%' } })
      gsap.to('.engine-orbit', { rotate: 360, duration: 22, repeat: -1, ease: 'none' })
      gsap.to('.orbit-core', { rotate: -360, duration: 22, repeat: -1, ease: 'none' })
      gsap.from('.engine-lottie-frame', { opacity: 0, scale: .85, rotate: -4, duration: .8, scrollTrigger: { trigger: ref.current, start: 'top 62%' } })
    }, ref)
    return () => ctx.revert()
  }, [])
  return (
    <section className="scene scene--engine" id="engine" ref={ref}>
      <div className="section-kicker">03 / THE ENGINE</div>
      <h2 className="display display--medium">FROM CODE<br />TO <span>UNDERSTANDING.</span></h2>
      <div className="engine-flow" aria-label="CFlow processing pipeline">{['YOUR CODE', 'PARSE', 'EXECUTE', 'VISUALIZE', 'UNDERSTAND'].map((item, index) => <div className="engine-step" key={item}><span>0{index + 1}</span><strong>{item}</strong>{index < 4 && <b>→</b>}</div>)}</div>
      <div className="engine-lottie-frame"><div className="engine-lottie-frame__label">MOTION / ENGINE STATE</div><EngineLottie /><div className="engine-lottie-frame__index">01 — 05</div></div>
      <div className="engine-orbit" aria-hidden="true"><div className="orbit-core">C·FLOW</div><div className="orbit-node orbit-node--a">PARSE</div><div className="orbit-node orbit-node--b">STATE</div><div className="orbit-node orbit-node--c">FLOW</div></div>
    </section>
  )
}

function ExecutionStory() {
  const ref = useRef(null)
  useEffect(() => {
    const ctx = gsap.context(() => {
      const lines = gsap.utils.toArray('.exec-line')
      const cards = gsap.utils.toArray('.memory-card')
      const tl = gsap.timeline({ scrollTrigger: { trigger: ref.current, start: 'top top', end: '+=2400', scrub: 1, pin: true } })
      lines.forEach((line, index) => { tl.to(line, { className: '+=is-active', duration: .35 }, index); tl.to(cards[index], { opacity: 1, y: 0, duration: .45 }, index + .12) })
      tl.to('.exec-transfer', { opacity: 1, duration: .3 })
      tl.to('.exec-result', { opacity: 1, scale: 1, duration: .5 })
    }, ref)
    return () => ctx.revert()
  }, [])
  return (
    <section className="execution" ref={ref}>
      <div className="execution__intro"><div className="section-kicker">04 / SIGNATURE EXPERIENCE</div><h2 className="display display--small">DON'T READ<br />THE CODE.<br /><span>WATCH IT.</span></h2><div className="execution-scroll-note">SCROLL TO EXECUTE <b>↓</b></div></div>
      <div className="execution__stage"><div className="execution-code">{codeLines.map((line, index) => <div className="exec-line" key={line}><span>{index + 1}</span><code>{line}</code></div>)}</div><div className="execution-memory">{[['x', '10'], ['y', '20'], ['sum', '30']].map(([name, value]) => <div className="memory-card" key={name}><small>{name}</small><strong>{value}</strong></div>)}</div><div className="exec-transfer" aria-hidden="true"><div className="exec-transfer__track" /><div className="exec-transfer__dot" /><span className="exec-transfer__label">VALUE MOVING THROUGH STATE</span></div><div className="exec-insight"><span>LINE → STATE → MEMORY</span><span>STEP 03 / 03</span></div><div className="exec-result">OUTPUT <b>30</b></div></div>
    </section>
  )
}

function Capabilities() {
  const items = [['VARIABLES', 'x → 10'], ['CONDITIONS', 'x > 5 → TRUE'], ['LOOPS', '0 → 1 → 2 → 3 → …'], ['FUNCTIONS', 'main() → calculate() → return']]
  return <section className="scene scene--capabilities"><div className="section-kicker">05 / CAPABILITIES</div><h2 className="display display--medium">EVERY STATE.<br /><span>VISIBLE.</span></h2><div className="capability-list">{items.map(([title, value], index) => <div className="capability" key={title}><span>0{index + 1}</span><strong>{title}</strong><code>{value}</code></div>)}</div><div className="capability-system"><div className="capability-system__card"><strong>PROGRAM STATE</strong><code>variables · branches · loops</code></div><div className="capability-system__core">C·FLOW</div><div className="capability-system__card"><strong>VISIBLE FLOW</strong><code>trace · memory · output</code></div></div></section>
}

function ProductPreview() {
  const ref = useRef(null)
  useEffect(() => { const ctx = gsap.context(() => { gsap.from('.preview-window', { y: 80, rotate: 2, opacity: 0, duration: 1, ease: 'power3.out', scrollTrigger: { trigger: ref.current, start: 'top 68%' } }); gsap.from('.preview-flow b, .preview-flow strong', { scale: .8, opacity: 0, stagger: .18, duration: .55, scrollTrigger: { trigger: ref.current, start: 'top 60%' } }) }, ref); return () => ctx.revert() }, [])
  return <section className="scene scene--preview" ref={ref}><div className="section-kicker">07 / THE PRODUCT</div><div className="preview-copy"><h2 className="display display--medium">THE REAL<br /><span>WORKSPACE.</span></h2><p>Write C or C++. Run it. Then follow every meaningful state as your program moves.</p><div className="preview-tags"><span>CODE</span><span>MEMORY</span><span>FLOW GRAPH</span></div></div><div className="preview-window"><div className="preview-window__top"><span className="preview-window__dots"><i /><i /><i /></span><span>C·FLOW / WORKSPACE</span><span className="preview-window__signal"><b /> FLOW STATE READY</span></div><div className="preview-code"><span>01</span> int main() {'{'}<br /><span>02</span> &nbsp;&nbsp;int x = 10;<br /><span>03</span> &nbsp;&nbsp;return x;<br /><span>04</span> {'}'}</div><div className="preview-flow preview-window__flow"><b className="preview-flow__node">main()</b><i className="preview-flow__connector" /><b className="preview-flow__node">x = 10</b><i className="preview-flow__connector" /><strong className="preview-flow__node">RETURN 10</strong></div><div className="preview-metrics"><span>EXECUTION<b>04 STEPS</b></span><span>MEMORY<b>01 ACTIVE</b></span><span>OUTPUT<b>10</b></span></div></div></section>
}

export default function LandingPage() {
  const page = useRef(null)
  useEffect(() => {
    const cleanupSmoothScroll = initLandingSmoothScroll()
    const ctx = gsap.context(() => {
      const intro = gsap.timeline({ defaults: { ease: 'power4.out' } })
      intro.from('.landing-header', { y: -24, opacity: 0, duration: .7 }).from('.hero__eyebrow', { opacity: 0, y: 16, duration: .45 }, '-=.3').from('.hero__title-line', { yPercent: 110, duration: .8, stagger: .08 }, '-=.25').from('.hero__copy, .hero__actions', { opacity: 0, y: 18, duration: .55 }, '-=.25').from('.hero-code', { opacity: 0, x: 70, rotate: 2, duration: .9 }, '-=.6').from('.hero-flow-map', { opacity: 0, scale: .9, duration: .7 }, '-=.4')
      gsap.utils.toArray('.reveal-on-scroll').forEach((element) => gsap.from(element, { opacity: 0, y: 60, duration: 1, ease: 'power3.out', scrollTrigger: { trigger: element, start: 'top 82%' } }))
      gsap.to('.hero-grid', { yPercent: 12, scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } })
    }, page)
    return () => { ctx.revert(); cleanupSmoothScroll() }
  }, [])

  const enterApp = () => window.location.assign('/auth')
  return <main className="landing landing-enhancements" ref={page}>
    <div className="hero-grid" aria-hidden="true" />
    <header className="landing-header"><a className="brand" href="/">C·FLOW<span>/</span></a><div className="header-center">VISUAL EXECUTION / 2026</div><button className="header-link" onClick={enterApp}>SIGN IN ↗</button></header>
    <section className="hero scene"><div className="hero__content"><div className="hero__eyebrow">A VISUAL EXECUTION ENVIRONMENT FOR C / C++</div><h1 className="display hero__title"><span className="hero__title-line">SEE YOUR CODE.</span><span className="hero__title-line">THINK IN <span>FLOW.</span></span></h1><p className="hero__copy">Understand programs by watching them execute.</p><div className="hero__actions"><button className="primary-button" onClick={enterApp}>START FLOWING <b>→</b></button><span>NO SETUP. JUST EXECUTE.</span></div></div><HeroCode /><HeroFlowMap /><div className="hero-telemetry"><span>CPU / TRACE 001</span><span>STATE / ACTIVE</span><span>FLOW / 98%</span></div><div className="hero-scroll">SCROLL <span>↓</span></div></section>
    <div className="landing-marquee" aria-hidden="true"><div>C·FLOW — SEE THE STATE — FOLLOW THE EXECUTION — C·FLOW — SEE THE STATE — FOLLOW THE EXECUTION —</div></div>
    <section className="scene problem scene--yellow reveal-on-scroll"><div className="section-kicker">02 / THE PROBLEM</div><h2 className="display display--huge">CODE IS<br /><span>STATIC.</span></h2><div className="problem-divider">EXECUTION ISN'T.</div><p>Source code tells you what you wrote. C·FLOW helps you see what the machine actually does.</p><div className="problem-signal"><span /> STATE CHANGES IN REAL TIME <b>→</b></div><ProblemVisual /></section>
    <Engine /><ExecutionStory /><Capabilities />
    <section className="scene philosophy reveal-on-scroll"><div className="section-kicker">06 / PHILOSOPHY</div><h2 className="display display--huge">NOT JUST<br />A CODE<br /><span>EDITOR.</span></h2><p className="philosophy-line">A WAY TO SEE PROGRAMS.</p></section>
    <ProductPreview />
    <section className="scene cta reveal-on-scroll"><div className="section-kicker">08 / READY?</div><h2 className="display display--medium">READY TO SEE<br />YOUR CODE<br /><span>DIFFERENTLY?</span></h2><button className="primary-button primary-button--large" onClick={enterApp}>START FLOWING <b>→</b></button></section>
    <footer className="landing-footer"><div><strong>C·FLOW</strong><span>SEE YOUR CODE. THINK IN FLOW.</span></div><nav><a href="https://github.com/inputtext/CFlow">GitHub</a><a href="#engine">Engine</a><a href="/auth">Sign in</a></nav><small>© 2026 C·FLOW</small></footer>
  </main>
}
