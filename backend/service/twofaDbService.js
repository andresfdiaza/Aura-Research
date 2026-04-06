const { findUserByEmail } = require('../repository/userRepository');
const { setUser2FASecret } = require('../repository/twofaRepository');
const { generate2FASecret, getQRCodeDataURL, verify2FAToken } = require('./2faService');

async function get2FAStatus(email) {
  const user = await findUserByEmail(email);
  return !!user?.twofa_secret;
}

async function activate2FA(email) {
  const secret = generate2FASecret(email);
  await setUser2FASecret(email, secret.base32);
  const qr = await getQRCodeDataURL(secret);
  return { qr, secret: secret.base32 };
}

async function verify2FA(email, token) {
  const user = await findUserByEmail(email);
  if (!user?.twofa_secret) return false;
  return verify2FAToken({ base32: user.twofa_secret }, token);
}

module.exports = { get2FAStatus, activate2FA, verify2FA };
