import { useEffect, useRef, RefObject } from 'react';

export interface UseFocusTrapOptions {
  /** Whether the modal/trap is currently active (default true) */
  isOpen?: boolean;
  /** Callback to invoke when Escape key is pressed */
  onClose?: () => void;
  /** Whether to automatically focus the first element on mount (default true) */
  autoFocus?: boolean;
  /** Optional specific element ref to focus initially */
  initialFocusRef?: RefObject<HTMLElement | null>;
  /** Whether Escape key should trigger onClose (default true) */
  closeOnEscape?: boolean;
  /** Whether to return focus to the previously active element on unmount (default true) */
  returnFocusOnDeactivate?: boolean;
}

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'area[href]',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'button:not([disabled])',
  'iframe',
  'object',
  'embed',
  '[contenteditable]',
  '[tabindex]:not([tabindex^="-"])',
].join(', ');

/**
 * useFocusTrap
 *
 * Implements WCAG 2.1.2 accessible modal focus management:
 * 1. Traps keyboard Tab / Shift+Tab navigation within the container
 * 2. Listens for Escape key to close the dialog
 * 3. Focuses first focusable element on open
 * 4. Restores focus to previous active element on close
 */
export function useFocusTrap<T extends HTMLElement = HTMLDivElement>(
  options: UseFocusTrapOptions = {}
): RefObject<T> {
  const {
    isOpen = true,
    onClose,
    autoFocus = true,
    initialFocusRef,
    closeOnEscape = true,
    returnFocusOnDeactivate = true,
  } = options;

  const containerRef = useRef<T>(null);
  const previousActiveElementRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    if (returnFocusOnDeactivate && typeof document !== 'undefined') {
      previousActiveElementRef.current = document.activeElement as HTMLElement | null;
    }

    const container = containerRef.current;
    if (!container) return;

    // Set container tabindex if not present to enable programmatic focus
    if (!container.hasAttribute('tabindex')) {
      container.setAttribute('tabindex', '-1');
    }

    // Auto-focus initial or first interactive element
    const focusTimer = setTimeout(() => {
      if (!containerRef.current) return;
      if (initialFocusRef?.current) {
        initialFocusRef.current.focus();
      } else if (autoFocus) {
        const focusables = Array.from(
          containerRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
        ).filter(el => el.offsetParent !== null && !el.hasAttribute('disabled'));

        if (focusables.length > 0) {
          focusables[0].focus();
        } else {
          containerRef.current.focus();
        }
      }
    }, 30);

    const handleKeyDown = (e: KeyboardEvent) => {
      const currentContainer = containerRef.current;
      if (!currentContainer) return;

      // Handle Escape key
      if (closeOnEscape && (e.key === 'Escape' || e.key === 'Esc')) {
        e.stopPropagation();
        e.preventDefault();
        onClose?.();
        return;
      }

      // Handle Tab trapping
      if (e.key === 'Tab') {
        const focusableElements = Array.from(
          currentContainer.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
        ).filter(el => el.offsetParent !== null && !el.hasAttribute('disabled'));

        if (focusableElements.length === 0) {
          e.preventDefault();
          currentContainer.focus();
          return;
        }

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];
        const activeEl = document.activeElement;

        if (e.shiftKey) {
          // Shift + Tab: moving backwards
          if (activeEl === firstElement || !currentContainer.contains(activeEl)) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          // Tab: moving forwards
          if (activeEl === lastElement || !currentContainer.contains(activeEl)) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);

    return () => {
      clearTimeout(focusTimer);
      window.removeEventListener('keydown', handleKeyDown, true);

      if (returnFocusOnDeactivate && previousActiveElementRef.current) {
        try {
          previousActiveElementRef.current.focus();
        } catch {
          // Ignore if element is no longer in DOM
        }
      }
    };
  }, [isOpen, onClose, autoFocus, initialFocusRef, closeOnEscape, returnFocusOnDeactivate]);

  return containerRef;
}
