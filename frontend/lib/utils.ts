import {type ClassValue, clsx} from "clsx"
import {twMerge} from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}


export function getChangedFields<T extends Record<string, any>>(original: T, current: T): Partial<T> {
  const result: Partial<T> = {};

  (Object.keys(current) as (keyof T)[]).forEach((key) => {
    if (current[key] !== original[key]) {
      result[key] = current[key];
    }
  });

  return result;
}


export function bytesFormatter(bytes?: number) {
  if(bytes === undefined || bytes === null) {
    return "Unknown"
  }
  // Approximate to the closest prefixed unit
  const units = [
    "B",
    "KiB",
    "MiB",
    "GiB",
    "TiB",
    "PiB",
    "EiB",
    "ZiB",
    "YiB",
  ];
  const exponent = Math.min(
      Math.floor(Math.log(bytes) / Math.log(1024)),
      units.length - 1,
  );
  const approx = bytes / 1024 ** exponent;
  return exponent === 0
      ? `${bytes} bytes`
      : `${approx.toFixed(3)} ${
          units[exponent]
      }`;
}