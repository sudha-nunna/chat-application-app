import CryptoJS from "crypto-js";

// Load environment variables or fallbacks
const password = import.meta.env.VITE_TBALM_PASS || "saddfgsfdgs";
const salt = import.meta.env.VITE_TBALM_SALT || "dfgsdfggg";

if (!password || !salt) {
    console.warn(
        "[Crypto Warning] Missing environment variables: VITE_TBALM_PASS and/or VITE_TBALM_SALT."
    );
}

// Ensure salt is in correct format
const saltWordArray = CryptoJS.enc.Utf8.parse(salt);

// Derive key
let key;
try {
    key = CryptoJS.PBKDF2(password, saltWordArray, {
        keySize: 256 / 32,
        iterations: 100,
    });
} catch (error) {
    console.error("Error deriving key:", error);
}

const getKeyString = () => (key ? key.toString() : password);

export const encrypt = function (text) {
    try {
        if (!text) return "";
        const str = typeof text === "object" ? JSON.stringify(text) : String(text);
        return CryptoJS.AES.encrypt(str, getKeyString()).toString();
    } catch (error) {
        console.error("Encryption error:", error);
        return error;
    }
};

export const encryptobj = function (obj) {
    try {
        if (!obj) return "";
        return CryptoJS.AES.encrypt(
            JSON.stringify(obj),
            getKeyString()
        ).toString();
    } catch (error) {
        console.error("Encryption obj error:", error);
        return error;
    }
};

export const decrypt = function (encdata) {
    try {
        if (!encdata) return null;
        const datat = CryptoJS.AES.decrypt(encdata, getKeyString());
        return datat.toString(CryptoJS.enc.Utf8);
    } catch (error) {
        console.error("Decryption error:", error);
        return error;
    }
};

export const decryptobj = function (encdata) {
    try {
        if (!encdata) return null;
        const datatt = CryptoJS.AES.decrypt(encdata, getKeyString());
        const decodedStr = datatt.toString(CryptoJS.enc.Utf8);
        return decodedStr ? JSON.parse(decodedStr) : null;
    } catch (error) {
        console.error("Decryption obj error:", error);
        return error;
    }
};

const helpers = {
    encrypt,
    encryptobj,
    decrypt,
    decryptobj,
};

export default helpers;
