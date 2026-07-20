import QRCode from 'qrcode';

export const generateAssetQR = async (assetId) => {
  try {
    // Generate a deep link redirect URL for QR scanning
    const scanUrl = `http://localhost:5173/assets/scan/${assetId}`;
    
    // Generate the QR code as a base64 PNG Data URL
    const qrDataUrl = await QRCode.toDataURL(scanUrl, {
      errorCorrectionLevel: 'H',
      margin: 2,
      width: 300,
      color: {
        dark: '#0f172a', // Slate-900 (matches shadcn branding color)
        light: '#ffffff'
      }
    });

    return qrDataUrl;
  } catch (error) {
    console.error('Failed to generate QR code:', error.message);
    throw new Error('QR Code generation failed');
  }
};
