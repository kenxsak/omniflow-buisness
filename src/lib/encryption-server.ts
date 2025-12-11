import { createDecipheriv, createCipheriv, randomBytes } from 'crypto';

export interface EncryptedData {
  encrypted: true;
  ciphertext: string;
  iv: string;
}

const ALGORITHM = 'aes-256-gcm';

export function isEncrypted(value: any): value is EncryptedData {
  return (
    typeof value === 'object' &&
    value !== null &&
    value.encrypted === true &&
    typeof value.ciphertext === 'string' &&
    typeof value.iv === 'string'
  );
}

export function decryptServerSide(data: EncryptedData): string {
  if (!isEncrypted(data)) {
    throw new Error('Invalid encrypted data format');
  }

  const encryptionKeyBase64 = process.env.ENCRYPTION_KEY || process.env.NEXT_PUBLIC_ENCRYPTION_KEY;
  
  if (!encryptionKeyBase64) {
    throw new Error('ENCRYPTION_KEY environment variable is required for decryption');
  }

  try {
    const keyBuffer = Buffer.from(encryptionKeyBase64, 'base64');
    
    if (keyBuffer.length !== 32) {
      throw new Error(`Invalid ENCRYPTION_KEY length: expected 32 bytes, got ${keyBuffer.length} bytes`);
    }

    const ciphertextBuffer = Buffer.from(data.ciphertext, 'base64');
    const ivBuffer = Buffer.from(data.iv, 'base64');
    
    // Extract auth tag (last 16 bytes of ciphertext for GCM mode)
    const authTag = ciphertextBuffer.slice(-16);
    const encryptedData = ciphertextBuffer.slice(0, -16);
    
    const decipher = createDecipheriv(ALGORITHM, keyBuffer, ivBuffer);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encryptedData);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    
    return decrypted.toString('utf8');
  } catch (error) {
    console.error('Server-side decryption failed:', error);
    throw new Error(`Decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export function encryptServerSide(plaintext: string): EncryptedData {
  if (!plaintext) {
    throw new Error('Cannot encrypt empty string');
  }

  const encryptionKeyBase64 = process.env.ENCRYPTION_KEY || process.env.NEXT_PUBLIC_ENCRYPTION_KEY;
  
  if (!encryptionKeyBase64) {
    throw new Error('ENCRYPTION_KEY environment variable is required for encryption');
  }

  try {
    const keyBuffer = Buffer.from(encryptionKeyBase64, 'base64');
    
    if (keyBuffer.length !== 32) {
      throw new Error(`Invalid ENCRYPTION_KEY length: expected 32 bytes, got ${keyBuffer.length} bytes`);
    }

    const iv = randomBytes(12);
    const cipher = createCipheriv(ALGORITHM, keyBuffer, iv);
    
    let encrypted = cipher.update(plaintext, 'utf8');
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    
    const authTag = cipher.getAuthTag();
    const ciphertextWithTag = Buffer.concat([encrypted, authTag]);
    
    return {
      encrypted: true,
      ciphertext: ciphertextWithTag.toString('base64'),
      iv: iv.toString('base64')
    };
  } catch (error) {
    console.error('Server-side encryption failed:', error);
    throw new Error(`Encryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export function decryptApiKeyServerSide(value: string | EncryptedData): string {
  if (!value) {
    console.warn('⚠️ Attempted to decrypt null/undefined value');
    return '';
  }

  if (isEncrypted(value)) {
    console.log('🔍 Encrypted data detected, decrypting on server...');
    try {
      return decryptServerSide(value);
    } catch (error) {
      console.error('❌ Failed to decrypt API key on server:', error);
      return '';
    }
  }

  if (typeof value === 'string') {
    console.log('📝 Plaintext API key detected (backward compatibility mode)');
    return value;
  }

  console.warn('⚠️ Unexpected API key format:', typeof value);
  return '';
}
