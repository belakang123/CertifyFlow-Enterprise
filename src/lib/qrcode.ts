import QRCode from 'qrcode';

export async function generateQRCodeDataURL(
  text: string,
  size: number = 200
): Promise<string> {
  try {
    const dataUrl = await QRCode.toDataURL(text, {
      width: size,
      margin: 1,
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
      errorCorrectionLevel: 'M',
    });
    return dataUrl;
  } catch {
    throw new Error(`Failed to generate QR code for: ${text}`);
  }
}

export async function generateQRCodeCanvas(
  text: string,
  canvas: HTMLCanvasElement,
  size: number = 200
): Promise<void> {
  await QRCode.toCanvas(canvas, text, {
    width: size,
    margin: 1,
    errorCorrectionLevel: 'M',
  });
}
