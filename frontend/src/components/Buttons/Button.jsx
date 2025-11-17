import React from 'react'
import './Button.css'

export default function Button({ children, variant = 'primary', className = '', ...props }) {
  const buttonClass = variant === 'secondary' 
    ? `btn btn-secondary ${className}`.trim()
    : `btn ${className}`.trim()

  return (
    <button className={buttonClass} {...props}>
      {children}
    </button>
  )
}
