import { useCallback, useEffect, useState } from 'react'
import {
  isBrowser,
  getScrollTop,
  getScrollLeft,
  addScrollListener,
  removeScrollListener,
} from './domUtils'

export type ScrollDirection = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT' | null

export interface ScrollDirectionHookResult {
  isScrolling: boolean
  isScrollingX: boolean
  isScrollingY: boolean
  isScrollingUp: boolean
  isScrollingDown: boolean
  isScrollingLeft: boolean
  isScrollingRight: boolean
  scrollDirection: ScrollDirection
  scrollTargetRef: (node: HTMLElement) => void
}

export function useScrollDirection(target?: HTMLElement): ScrollDirectionHookResult {
  const [targetFromApi, setTargetFromApi] = useState<HTMLElement | undefined>()
  const [targetFromProps, setTargetFromProps] = useState<HTMLElement | undefined>()
  const [scrollDirection, setScrollDirection] = useState<ScrollDirection>(null)
  const targetToUse = targetFromProps || targetFromApi

  const isScrolling = scrollDirection !== null
  const isScrollingX = scrollDirection === 'LEFT' || scrollDirection === 'RIGHT'
  const isScrollingY = scrollDirection === 'UP' || scrollDirection === 'DOWN'
  const isScrollingUp = scrollDirection === 'UP'
  const isScrollingDown = scrollDirection === 'DOWN'
  const isScrollingLeft = scrollDirection === 'LEFT'
  const isScrollingRight = scrollDirection === 'RIGHT'

  const scrollTargetRef = useCallback((node: HTMLElement) => {
    setTargetFromApi(node)
  }, [])

  useEffect(() => {
    setTargetFromProps(target)
  }, [target])

  useEffect(() => {
    if (isBrowser()) {
      let scrollTimeout: number
      let lastScrollTop = getScrollTop(targetToUse)
      let lastScrollLeft = getScrollLeft(targetToUse)

      const handleScroll = () => {
        // Reset scroll direction when scrolling stops
        // window.clearTimeout(scrollTimeout)
        // scrollTimeout = window.setTimeout(() => {
        //   setScrollDirection(null)
        // }, 66)

        // Set vertical direction while scrolling
        const scrollTop = getScrollTop(targetToUse)
        if (scrollTop > lastScrollTop) {
          setScrollDirection('DOWN')
        } else if (scrollTop < lastScrollTop) {
          setScrollDirection('UP')
        }
        lastScrollTop = scrollTop

        // Set horizontal scroll direction
        const scrollLeft = getScrollLeft(targetToUse)
        if (scrollLeft > lastScrollLeft) {
          setScrollDirection('RIGHT')
        } else if (scrollLeft < lastScrollLeft) {
          setScrollDirection('LEFT')
        }
        lastScrollLeft = scrollLeft
      }

      addScrollListener(handleScroll, targetToUse)
      return () => removeScrollListener(handleScroll, targetToUse)
    }
  }, [targetToUse])

  return {
    isScrolling,
    isScrollingX,
    isScrollingY,
    isScrollingUp,
    isScrollingDown,
    isScrollingLeft,
    isScrollingRight,
    scrollDirection,
    scrollTargetRef,
  }
}
