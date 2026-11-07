import crypto from 'crypto';
import config from '../config';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // Initialization vector length
const SECRET_KEY = config.crypto_secret as string; // Must be 32 characters

/**
 * Encrypts plain text
 */
function encrypt(text: string) {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(
        ALGORITHM,
        Buffer.from(SECRET_KEY, 'hex'),
        iv,
    );

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag().toString('hex');

    // We store the IV and AuthTag along with the message (separated by colons)
    // because they are needed for decryption later.
    return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

/**
 * Decrypts hashed text
 */
function decrypt(hash: string) {
    const [ivHex, authTagHex, encryptedText] = hash.split(':');

    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const decipher = crypto.createDecipheriv(
        ALGORITHM,
        Buffer.from(SECRET_KEY, 'hex'),
        iv,
    );

    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
}

const cryptoHelper = { encrypt, decrypt };

export default cryptoHelper;