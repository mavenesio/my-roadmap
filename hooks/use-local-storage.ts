"use client"

import { useState, useEffect } from 'react'

export function useLocalStorage<T>(key: string, initialValue: T) {
  // Estado para almacenar nuestro valor
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === "undefined") {
      return initialValue
    }
    try {
      const item = window.localStorage.getItem(key)
      return item ? JSON.parse(item) : initialValue
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error)
      return initialValue
    }
  })

  // Función para actualizar el valor
  const setValue = (value: T | ((val: T) => T)) => {
    try {
      // Use setStoredValue with a function to access the most recent state
      setStoredValue(prevValue => {
        const valueToStore = value instanceof Function ? value(prevValue) : value
        
        // Save to localStorage
      if (typeof window !== "undefined") {
        window.localStorage.setItem(key, JSON.stringify(valueToStore))
      }
        
        return valueToStore
      })
    } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error)
    }
  }

  // Función para limpiar el valor
  const removeValue = () => {
    try {
      setStoredValue(initialValue)
      if (typeof window !== "undefined") {
        window.localStorage.removeItem(key)
      }
    } catch (error) {
      console.error(`Error removing localStorage key "${key}":`, error)
    }
  }

  return [storedValue, setValue, removeValue] as const
}
