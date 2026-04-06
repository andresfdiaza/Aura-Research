// 2FA Service: generates secret, QR, and verifies tokens
const speakeasy = require('speakeasy');
const qrcode = require('qrcode');

function generate2FASecret(email) {
  const secret = speakeasy.generateSecret({ name: `AuraResearch (${email})` });
  return secret;
}

async function getQRCodeDataURL(secret) {
  return await qrcode.toDataURL(secret.otpauth_url);
}

function verify2FAToken(secret, token) {
  return speakeasy.totp.verify({
    secret: secret.base32,
    encoding: 'base32',
    token,
    window: 1
  });
}

module.exports = { generate2FASecret, getQRCodeDataURL, verify2FAToken };