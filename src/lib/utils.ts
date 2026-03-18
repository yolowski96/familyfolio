import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

let _privacyMode = false;

export function setPrivacyMode(enabled: boolean) {
  _privacyMode = enabled;
}

export function getPrivacyMode() {
  return _privacyMode;
}

const PRIVACY_MASK = '•••••';

export function formatCurrency(value: number, decimals: number = 2): string {
  if (_privacyMode) return PRIVACY_MASK;
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value)
}

export function formatCurrencyCompact(value: number): string {
  if (_privacyMode) return PRIVACY_MASK;
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

export function formatQuantity(value: number): string {
  if (_privacyMode) return PRIVACY_MASK;
  return value.toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 })
}
