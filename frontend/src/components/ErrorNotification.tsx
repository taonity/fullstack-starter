'use client'

import { CircleAlert, X } from 'lucide-react'
import { createPortal } from 'react-dom'

type ErrorNotificationProps = {
  message: string
  onClose?: () => void
}

export default function ErrorNotification({ message, onClose }: ErrorNotificationProps) {
  if (typeof document === 'undefined') return null

  return createPortal(
    <div
      className="error-notification"
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
    >
      <CircleAlert className="error-notification__icon" aria-hidden="true" />
      <p>{message}</p>
      {onClose && (
        <button type="button" onClick={onClose} aria-label="Dismiss notification">
          <X aria-hidden="true" />
        </button>
      )}
    </div>,
    document.body,
  )
}
