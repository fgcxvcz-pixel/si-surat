import type {} from 'react'

interface PasswordValidationLabelProps {
  message: string
  color: 'gray' | 'red' | 'green'
  icon: string
  isEmpty: boolean
}

export function PasswordValidationLabel({
  message,
  color,
  icon,
  isEmpty,
}: PasswordValidationLabelProps) {
  if (isEmpty) {
    return null
  }

  const colorMap = {
    gray: 'text-gray-400',
    red: 'text-red-600',
    green: 'text-green-600',
  }

  return (
    <div className={`text-xs font-medium mt-1.5 flex items-center gap-1 ${colorMap[color]}`}>
      <span>{icon}</span>
      <span>{message}</span>
    </div>
  )
}
