export interface Date {
  year: number
  month: number
  day: number
}

export function isDate(date: Date): date is Date {
  return 'year' in date && 'month' in date && 'day' in date
}

export interface LatLng {
  latitude: number
  longitude: number
}

export interface LatLngBox {
  sw: LatLng
  ne: LatLng
}

export interface Place {
  address?: string
  center: LatLng
}
