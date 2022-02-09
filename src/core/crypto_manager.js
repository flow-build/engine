const crypto = require("crypto");

function buildCrypto(type, data) {
  let crypto;
  switch (type) {
    default: {
      crypto = defaultCrypto(data);
      break;
    }
  }

  return crypto;
}

function defaultCrypto(data) {
  const key = data.key;
  if (Buffer.byteLength(key, "utf8") !== 32) {
    throw new Error("Invalid key size");
  }
  return {
    encrypt: (plain_text) => {
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
      let encrypted = cipher.update(plain_text.toString(), "utf8", "hex");
      encrypted += cipher.final("hex");
      return {
        crypted_text: encrypted,
        iv: iv.toString("hex"),
      };
    },
    decrypt: ({ crypted_text, iv: iv_string }) => {
      const iv = Buffer.from(iv_string, "hex");
      const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
      let decrypted = decipher.update(crypted_text, "hex", "utf8");
      decrypted += decipher.final("utf8");
      return decrypted;
    },
  };
}

let crypto_instance;
function getCrypto() {
  if (!crypto_instance) {
    throw new Error("crypto not defined");
  }

  return crypto_instance;
}

function setCrypto(crypto) {
  crypto_instance = crypto;
}

module.exports = {
  buildCrypto,
  getCrypto,
  setCrypto,
};
