import { useEffect, useRef } from 'react'
import { DotLottieReact } from '@lottiefiles/dotlottie-react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

const SAMPLE_LOTTIE = 'https://lottie.host/4db68bbd-31f6-4cd8-84eb-189de081159a/IGmMCqhzpt.lottie'

export default function EngineLottie() {
  const sectionRef = useRef(null)
  const playerRef = useRef(null)

  useEffect(() => {
    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        trigger: sectionRef.current,
        start: 'top 75%',
        end: 'bottom 25%',
        scrub: true,
        onUpdate: (self) => {
          const player = playerRef.current
          if (!player?.totalFrames) return
          player.setFrame(Math.round(self.progress * (player.totalFrames - 1)))
        },
      })
    }, sectionRef)

    return () => ctx.revert()
  }, [])

  return (
    <div className="engine-lottie" ref={sectionRef}>
      <div className="engine-lottie__label">SCROLL-DRIVEN / VISUAL PIPELINE</div>
      <DotLottieReact
        src={SAMPLE_LOTTIE}
        autoplay={false}
        loop={false}
        dotLottieRefCallback={(instance) => { playerRef.current = instance }}
        style={{ width: '100%', height: '100%' }}
      />
    </div>
  )
}
