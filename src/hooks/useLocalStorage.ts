import { useState, useEffect, useCallback, useRef } from 'react';
import type { UserSettings } from "@/lib/index";

/**
 * A generic hook for managing state in localStorage with TypeScript support.
 * 
 * @param key The key to store the data under in localStorage
 * @param initialValue The initial value to use if no value is found in localStorage
 */
export function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T | ((val: T) => T)) => void] {
  // State to store our value
  // Pass initial state function to useState so logic is only executed once
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === 'undefined') {
      return initialValue;
    }

    try {
      const item = window.localStorage.getItem(key);
      // Parse stored json or if none return initialValue
      return item ? (JSON.parse(item) as T) : initialValue;
    } catch (error) {
      // If error also return initialValue
      console.error(`Error reading localStorage key “${key}”:`, error);
      return initialValue;
    }
  });

  // Ref to track the latest key to prevent stale closures in effect
  const keyRef = useRef(key);
  useEffect(() => {
    keyRef.current = key;
  }, [key]);

  // Return a wrapped version of useState's setter function that persists the new value to localStorage
  const setValue = useCallback(
    (value: T | ((val: T) => T)) => {
      try {
        setStoredValue(prev => {
          const valueToStore = value instanceof Function ? (value as (val: T) => T)(prev) : value as T;
          try {
            if (typeof window !== 'undefined') {
              window.localStorage.setItem(keyRef.current, JSON.stringify(valueToStore));
              window.dispatchEvent(new Event('local-storage-update'));
            }
          } catch (err) {
            console.error(`Error writing localStorage key “${keyRef.current}”:`, err);
          }
          return valueToStore;
        });
      } catch (error) {
        console.error(`Error setting localStorage key “${keyRef.current}”:`, error);
      }
    },
    []
  );

  // Listen for changes in other tabs/windows
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === key && e.newValue !== null) {
        try {
          setStoredValue(JSON.parse(e.newValue));
        } catch (error) {
          console.error(`Error parsing storage change for “${key}”:`, error);
        }
      }
    };

    const handleCustomUpdate = () => {
      if (typeof window === 'undefined') return;
      try {
        const item = window.localStorage.getItem(key);
        if (item) {
          setStoredValue(JSON.parse(item));
        }
      } catch (error) {
        console.error(`Error parsing custom update for “${key}”:`, error);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('local-storage-update', handleCustomUpdate);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('local-storage-update', handleCustomUpdate);
    };
  }, [key]);

  return [storedValue, setValue];
}

// Example usage for UserSettings specifically if needed
export type { UserSettings };
