export function distanceKm(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number },
) {
  const radians = (value: number) => (value * Math.PI) / 180
  const earthRadiusKm = 6371
  const deltaLat = radians(to.lat - from.lat)
  const deltaLng = radians(to.lng - from.lng)
  const a = Math.sin(deltaLat / 2) ** 2 + Math.cos(radians(from.lat)) * Math.cos(radians(to.lat)) * Math.sin(deltaLng / 2) ** 2
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}
