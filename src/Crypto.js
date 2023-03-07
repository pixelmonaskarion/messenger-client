var CryptoJS = require("crypto-js");

function encrypt_message(message, key) {
    var ciphertext = CryptoJS.AES.encrypt(message.text, key).toString();
    message.text = ciphertext;
    return message;
}

function decrypt_message(message, key) {
    var bytes  = CryptoJS.AES.decrypt(message.text, key);
    var originalText = bytes.toString(CryptoJS.enc.Utf8);
    message.text = originalText;
    return message;
}

async function create_keys() {
    let keyPair = await window.crypto.subtle.generateKey(
        {
          name: "RSA-OAEP",
          modulusLength: 4096,
          publicExponent: new Uint8Array([1, 0, 1]),
          hash: "SHA-256",
        },
        true,
        ["encrypt", "decrypt"]
      );
    console.log(await window.crypto.subtle.exportKey("raw", keyPair.privateKey));
    return [await window.crypto.subtle.exportKey("raw", keyPair.privateKey), await window.crypto.subtle.exportKey("raw", keyPair.publicKey)];
}

let exported = {encrypt_message, decrypt_message, create_keys};
export default exported;