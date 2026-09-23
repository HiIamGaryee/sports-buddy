import jsQR from 'jsqr'
import qrcodeGenerator from 'qrcode-generator'

/**
 * QR encode/decode. Pure given the pixel or text data — no camera, no DOM,
 * no network: nothing here ever leaves the device or calls a third-party
 * service, so a check-in code never has to travel anywhere but a screen and
 * a phone's own camera.
 */

/**
 * A check-in payload → a `data:image/gif;base64,…` QR code image, offline.
 *
 * Error correction `H` (the highest) and a large cell size on purpose: this
 * code is photographed off a screen, across glare and at an angle, which is
 * the worst case for a QR. The bigger and more redundant it is, the more
 * often the first photo decodes.
 */
export function buildQrDataUrl(payload: string): string {
  const qr = qrcodeGenerator(0, 'H')
  qr.addData(payload)
  qr.make()
  return qr.createDataURL(12, 4)
}

/** Raw decoded pixels → the text a QR encodes, or `null` if none was found. */
export function decodeQrFromImageData(imageData: {
  data: Uint8ClampedArray
  width: number
  height: number
}): string | null {
  // `attemptBoth` also reads a code whose dark and light are swapped, which is
  // what a photo of a bright screen in a dark room often looks like.
  const result = jsQR(imageData.data, imageData.width, imageData.height, {
    inversionAttempts: 'attemptBoth',
  })
  return result?.data ?? null
}
