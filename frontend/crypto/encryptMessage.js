export const encryptMessage = async (message, receiverPublicKey) => {
    // 1. Generate AES key
    const aesKey = await crypto.subtle.generateKey(
        { name: "AES-GCM", length: 256 },
        true,
        ["encrypt", "decrypt"]
    );

    // 2. Encrypt message
    const iv = crypto.getRandomValues(new Uint8Array(12));

    const encoded = new TextEncoder().encode(message);

    const encryptedMessage = await crypto.subtle.encrypt(
        { name: "AES-GCM", iv },
        aesKey,
        encoded
    );

    // 3. Export AES key
    const exportedKey = await crypto.subtle.exportKey("raw", aesKey);

    // 4. Encrypt AES key using RSA
    const importedPublicKey = await crypto.subtle.importKey(
        "spki",
        Uint8Array.from(atob(receiverPublicKey), c => c.charCodeAt(0)),
        { name: "RSA-OAEP", hash: "SHA-256" },
        true,
        ["encrypt"]
    );

    const encryptedKey = await crypto.subtle.encrypt(
        { name: "RSA-OAEP" },
        importedPublicKey,
        exportedKey
    );

    return {
        encryptedMessage: btoa(String.fromCharCode(...new Uint8Array(encryptedMessage))),
        encryptedKey: btoa(String.fromCharCode(...new Uint8Array(encryptedKey))),
        iv: btoa(String.fromCharCode(...iv)),
    };
};