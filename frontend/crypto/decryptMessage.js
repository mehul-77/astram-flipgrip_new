export const decryptMessage = async (data) => {
    const { encryptedMessage, encryptedKey, iv } = data;

    // 1. Load private key
    const privateKeyBase64 = localStorage.getItem("privateKey");

    const privateKey = await crypto.subtle.importKey(
        "pkcs8",
        Uint8Array.from(atob(privateKeyBase64), c => c.charCodeAt(0)),
        { name: "RSA-OAEP", hash: "SHA-256" },
        true,
        ["decrypt"]
    );

    // 2. Decrypt AES key
    const aesKeyRaw = await crypto.subtle.decrypt(
        { name: "RSA-OAEP" },
        privateKey,
        Uint8Array.from(atob(encryptedKey), c => c.charCodeAt(0))
    );

    const aesKey = await crypto.subtle.importKey(
        "raw",
        aesKeyRaw,
        { name: "AES-GCM" },
        true,
        ["decrypt"]
    );

    // 3. Decrypt message
    const decrypted = await crypto.subtle.decrypt(
        {
            name: "AES-GCM",
            iv: Uint8Array.from(atob(iv), c => c.charCodeAt(0)),
        },
        aesKey,
        Uint8Array.from(atob(encryptedMessage), c => c.charCodeAt(0))
    );

    return new TextDecoder().decode(decrypted);
};