import jsQR from 'jsqr'
import qrcodeGenerator from 'qrcode-generator'

/**
 * QR encode/decode. Pure given the pixel or text data — no camera, no DOM,
 * no network: nothing here ever leaves the device or calls a third-party
 * service, so a check-in code never has to travel anywhere but a screen and
 * a phone's own camera.
 */

/** A check-in payload → a `data:image/gif;base64,…` QR code image, offline. */
export function buildQrDataUrl(payload: string): string {
  const qr = qrcodeGenerator(0, 'M')
  qr.addData(payload)
  qr.make()
  return qr.createDataURL(8, 4)
}

/** Raw decoded pixels → the text a QR encodes, or `null` if none was found. */
export function decodeQrFromImageData(imageData: {
  data: Uint8ClampedArray
  width: number
  height: number
}): string | null {
  const result = jsQR(imageData.data, imageData.width, imageData.height)
  return result?.data ?? null
}
