'use client'

import { useSyncExternalStore } from 'react'

const DEV_LOADING_KEY = 'dev.forceLoading'
const DEV_LOADING_EVENT = 'dev-force-loading-change'

export const isDevelopmentBuild = process.env.NODE_ENV === 'development'

export function isDevLoadingEnabled() {
  return isDevelopmentBuild && localStorage.getItem(DEV_LOADING_KEY) === 'true'
}

function subscribe(listener: () => void) {
  window.addEventListener(DEV_LOADING_EVENT, listener)
  window.addEventListener('storage', listener)
  return () => {
    window.removeEventListener(DEV_LOADING_EVENT, listener)
    window.removeEventListener('storage', listener)
  }
}

export function useDevLoading() {
  return useSyncExternalStore(subscribe, isDevLoadingEnabled, () => false)
}

export function setDevLoadingEnabled(enabled: boolean) {
  localStorage.setItem(DEV_LOADING_KEY, String(enabled))
  window.dispatchEvent(new Event(DEV_LOADING_EVENT))
}
