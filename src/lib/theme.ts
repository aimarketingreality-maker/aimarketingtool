
export const colors = {
  background: {
    primary: 'bg-gray-900',
    secondary: 'bg-gray-800',
  },
  text: {
    primary: 'text-white',
    secondary: 'text-gray-400',
  },
  accent: {
    primary: 'bg-yellow-400',
    secondary: 'bg-yellow-500',
  },
  border: {
    primary: 'border-gray-700',
  },
};

export const spacing = {
  component: {
    padding: 'p-4',
    margin: 'm-2',
  },
};

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const presets = {
  landingPage: `${colors.background.primary} ${colors.text.primary}`,
};
