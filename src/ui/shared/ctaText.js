const isTouch = navigator.maxTouchPoints > 0;

/**
 * Returns "Tap" on touch devices and "Press Space" on desktop so CTA strings
 * automatically match the available input method.
 */
export const ctaAction = isTouch ? 'Tap' : 'Press Space';
