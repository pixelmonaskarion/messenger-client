async function encrypt_message(message, key) {
	message.text = await encrypt(key, message.text);
	return message;
}

async function decrypt_message(message, key) {
	message.text = await decrypt(key, message.text);
	return message;
}

async function generateKeyPair() {
	const keyPair = await generateRSAKeyPair();
	return { publicKey: await exportRSAPublicKeyAsString(keyPair.publicKey), privateKey: await exportRSAPrivateKeyAsString(keyPair.privateKey) };
}

async function encrypt(publicKey, plaintext) {
	let publicKeyObject = await importRSAPublicKeyFromString(publicKey);
	return await encryptDataWithRSAPublicKey(plaintext, publicKeyObject);
}

async function decrypt(privateKey, encryptedText) {
	let privateKeyObject = await importRSAPrivateKeyFromString(privateKey);
	return await decryptDataWithRSAPrivateKey(encryptedText, privateKeyObject);
}

async function encryptAsArray(publicKey, plaintext) {
	let publicKeyObject = await importRSAPublicKeyFromString(publicKey);
	return await encryptDataWithRSAPublicKeyAsArray(plaintext, publicKeyObject);
}

async function decryptAsArray(privateKey, encryptedText) {
	let privateKeyObject = await importRSAPrivateKeyFromString(privateKey);
	return await decryptDataWithRSAPrivateKeyAsArray(encryptedText, privateKeyObject);
}

async function test() {
	const plaintext = "Hello World!";
	console.log(`plain text ${plaintext}`);
	const keyPair = await generateKeyPair();
	console.log(`Public key: ${keyPair.publicKey}`);
	console.log(`Private key: ${keyPair.privateKey}`);

	const encryptedText = await encrypt(keyPair.publicKey, plaintext);
	console.log(`Encrypted text: ${encryptedText}`);

	const decryptedText = await decrypt(keyPair.privateKey, encryptedText);
	console.log(`Decrypted text: ${decryptedText}`);
}

let exported = { generateKeyPair, decrypt_message, encrypt_message, test, encrypt, decrypt };
export default exported;

// Generate RSA key pair
const generateRSAKeyPair = async () => {
	const keyPair = await window.crypto.subtle.generateKey(
		{
			name: "RSA-OAEP",
			modulusLength: 2048,
			publicExponent: new Uint8Array([0x01, 0x00, 0x01]),
			hash: "SHA-256",
		},
		true,
		["encrypt", "decrypt"]
	);
	return keyPair;
};

// Export RSA public key as a string
const exportRSAPublicKeyAsString = async (publicKey) => {
	const exportedKey = await window.crypto.subtle.exportKey(
		"spki",
		publicKey
	);
	const exportedKeyString = String.fromCharCode(...new Uint8Array(exportedKey));
	return exportedKeyString;
};

// Export RSA private key as a string
const exportRSAPrivateKeyAsString = async (privateKey) => {
	const exportedKey = await window.crypto.subtle.exportKey(
		"pkcs8",
		privateKey
	);
	const exportedKeyString = String.fromCharCode(...new Uint8Array(exportedKey));
	return exportedKeyString;
};

// Import RSA public key from string
const importRSAPublicKeyFromString = async (keyString) => {
	const keyData = new Uint8Array(keyString.length);
	for (let i = 0; i < keyString.length; i++) {
		keyData[i] = keyString.charCodeAt(i);
	}
	const publicKey = await window.crypto.subtle.importKey(
		"spki",
		keyData.buffer,
		{
			name: "RSA-OAEP",
			hash: "SHA-256",
		},
		true,
		["encrypt"]
	);
	return publicKey;
};

// Import RSA private key from string
const importRSAPrivateKeyFromString = async (keyString) => {
	const keyData = new Uint8Array(keyString.length);
	for (let i = 0; i < keyString.length; i++) {
		keyData[i] = keyString.charCodeAt(i);
	}
	const privateKey = await window.crypto.subtle.importKey(
		"pkcs8",
		keyData.buffer,
		{
			name: "RSA-OAEP",
			hash: "SHA-256",
		},
		true,
		["decrypt"]
	);
	return privateKey;
};

// Encrypt data using RSA public key
const encryptDataWithRSAPublicKey = async (data, publicKey) => {
	const blockSize = 190; // Maximum RSA block size is 190 bytes for OAEP padding
	const dataBytes = new TextEncoder().encode(data);
	const encryptedBlocks = [];
	let offset = 0;
	while (offset < dataBytes.length) {
		const block = dataBytes.slice(offset, offset + blockSize);
		const encryptedBlock = await window.crypto.subtle.encrypt(
			{
				name: "RSA-OAEP",
			},
			publicKey,
			block
		);
		encryptedBlocks.push(encryptedBlock);
		offset += blockSize;
	}
	const encryptedData = new Uint8Array(
		encryptedBlocks.reduce((acc, block) => acc + block.byteLength, 0)
	);
	let offsetBytes = 0;
	encryptedBlocks.forEach((block) => {
		encryptedData.set(new Uint8Array(block), offsetBytes);
		offsetBytes += block.byteLength;
	});
	const encryptedDataString = String.fromCharCode(...encryptedData);
	return encryptedDataString;
};

const decryptDataWithRSAPrivateKey = async (encryptedDataString, privateKey) => {
	const encryptedData = new Uint8Array(encryptedDataString.length);
	for (let i = 0; i < encryptedDataString.length; i++) {
		encryptedData[i] = encryptedDataString.charCodeAt(i);
	}
	const blockSize = privateKey.algorithm.modulusLength / 8;
	const numBlocks = Math.ceil(encryptedData.length / blockSize);
	const decryptedBlocks = [];
	for (let i = 0; i < numBlocks; i++) {
		const blockOffset = i * blockSize;
		const block = encryptedData.slice(blockOffset, blockOffset + blockSize);
		const decryptedBlock = await window.crypto.subtle.decrypt(
			{
				name: "RSA-OAEP",
			},
			privateKey,
			block
		);
		decryptedBlocks.push(decryptedBlock);
	}
	const decryptedData = new Uint8Array(
		decryptedBlocks.reduce((acc, block) => acc + block.byteLength, 0)
	);
	let offsetBytes = 0;
	decryptedBlocks.forEach((block) => {
		decryptedData.set(new Uint8Array(block), offsetBytes);
		offsetBytes += block.byteLength;
	});
	const decryptedDataString = new TextDecoder().decode(decryptedData);
	return decryptedDataString;
};

const encryptDataWithRSAPublicKeyAsArray = async (data, publicKey) => {
	const blockSize = 190; // Maximum RSA block size is 190 bytes for OAEP padding
	const dataBytes = new TextEncoder().encode(data);
	const encryptedBlocks = [];
	let offset = 0;
	while (offset < dataBytes.length) {
		const block = dataBytes.slice(offset, offset + blockSize);
		const encryptedBlock = await window.crypto.subtle.encrypt(
			{
				name: "RSA-OAEP",
			},
			publicKey,
			block
		);
		encryptedBlocks.push(encryptedBlock);
		offset += blockSize;
	}
	const encryptedData = new Uint8Array(
		encryptedBlocks.reduce((acc, block) => acc + block.byteLength, 0)
	);
	let offsetBytes = 0;
	encryptedBlocks.forEach((block) => {
		encryptedData.set(new Uint8Array(block), offsetBytes);
		offsetBytes += block.byteLength;
	});
	return encryptedData;
};

const decryptDataWithRSAPrivateKeyAsArray = async (encryptedDataString, privateKey) => {
	const encryptedData = new Uint8Array(encryptedDataString.length);
	for (let i = 0; i < encryptedDataString.length; i++) {
		encryptedData[i] = encryptedDataString.charCodeAt(i);
	}
	const blockSize = privateKey.algorithm.modulusLength / 8;
	const numBlocks = Math.ceil(encryptedData.length / blockSize);
	const decryptedBlocks = [];
	for (let i = 0; i < numBlocks; i++) {
		const blockOffset = i * blockSize;
		const block = encryptedData.slice(blockOffset, blockOffset + blockSize);
		const decryptedBlock = await window.crypto.subtle.decrypt(
			{
				name: "RSA-OAEP",
			},
			privateKey,
			block
		);
		decryptedBlocks.push(decryptedBlock);
	}
	const decryptedData = new Uint8Array(
		decryptedBlocks.reduce((acc, block) => acc + block.byteLength, 0)
	);
	let offsetBytes = 0;
	decryptedBlocks.forEach((block) => {
		decryptedData.set(new Uint8Array(block), offsetBytes);
		offsetBytes += block.byteLength;
	});
	return decryptedBlocks;
};