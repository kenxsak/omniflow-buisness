"use client";

export interface EncryptedData {
  encrypted: true;
  ciphertext: string;
  iv: string;
}

const ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 256;
const IV_LENGTH = 12;

let cachedKey: CryptoKey | null = null;

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof crypto !== 'undefined' && typeof crypto.subtle !== 'undefined';
}

async function getEncryptionKey(): Promise<CryptoKey> {
  if (!isBrowser()) {
    throw new Error('Encryption is only available in browser environment');
  }

  if (cachedKey) {
    return cachedKey;
  }

  const encryptionKeyBase64 = process.env.NEXT_PUBLIC_ENCRYPTION_KEY || process.env.ENCRYPTION_KEY;
  
  if (!encryptionKeyBase64) {
    console.warn('⚠️ ENCRYPTION_KEY not found in environment variables. Encryption will not be available.');
    throw new Error('ENCRYPTION_KEY environment variable is required for encryption');
  }

  try {
    const keyData = Uint8Array.from(atob(encryptionKeyBase64), c => c.charCodeAt(0));
    
    if (keyData.length !== 32) {
      throw new Error(`Invalid ENCRYPTION_KEY length: expected 32 bytes, got ${keyData.length} bytes`);
    }

    cachedKey = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: ALGORITHM, length: KEY_LENGTH },
      false,
      ['encrypt', 'decrypt']
    );

    console.log('✅ Encryption key loaded successfully');
    return cachedKey;
  } catch (error) {
    console.error('❌ Failed to load encryption key:', error);
    throw new Error('Failed to load encryption key. Ensure ENCRYPTION_KEY is a valid 32-byte base64 string.');
  }
}

export function isEncrypted(value: any): value is EncryptedData {
  return (
    typeof value === 'object' &&
    value !== null &&
    value.encrypted === true &&
    typeof value.ciphertext === 'string' &&
    typeof value.iv === 'string'
  );
}

export async function encrypt(plaintext: string): Promise<EncryptedData> {
  if (!plaintext) {
    throw new Error('Cannot encrypt empty string');
  }

  try {
    const key = await getEncryptionKey();
    
    const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
    
    const encoder = new TextEncoder();
    const data = encoder.encode(plaintext);
    
    const ciphertext = await crypto.subtle.encrypt(
      { name: ALGORITHM, iv },
      key,
      data
    );

    const encryptedData: EncryptedData = {
      encrypted: true,
      ciphertext: btoa(String.fromCharCode(...new Uint8Array(ciphertext))),
      iv: btoa(String.fromCharCode(...iv))
    };

    console.log('🔒 Data encrypted successfully');
    return encryptedData;
  } catch (error) {
    console.error('❌ Encryption failed:', error);
    throw new Error(`Encryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function decrypt(data: EncryptedData): Promise<string> {
  if (!isEncrypted(data)) {
    throw new Error('Invalid encrypted data format');
  }

  try {
    const key = await getEncryptionKey();
    
    const ciphertext = Uint8Array.from(atob(data.ciphertext), c => c.charCodeAt(0));
    const iv = Uint8Array.from(atob(data.iv), c => c.charCodeAt(0));
    
    const decryptedData = await crypto.subtle.decrypt(
      { name: ALGORITHM, iv },
      key,
      ciphertext
    );

    const decoder = new TextDecoder();
    const plaintext = decoder.decode(decryptedData);

    console.log('🔓 Data decrypted successfully');
    return plaintext;
  } catch (error) {
    console.error('❌ Decryption failed:', error);
    throw new Error(`Decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function encryptApiKey(apiKey: string): Promise<EncryptedData> {
  if (!apiKey || apiKey.trim() === '') {
    throw new Error('Cannot encrypt empty API key');
  }

  console.log('🔐 Encrypting API key...');
  return encrypt(apiKey);
}

export async function decryptApiKey(value: string | EncryptedData): Promise<string> {
  if (!value) {
    console.warn('⚠️ Attempted to decrypt null/undefined value');
    return '';
  }

  if (!isBrowser()) {
    console.warn('⚠️ decryptApiKey called in non-browser environment, returning empty string');
    return '';
  }

  if (isEncrypted(value)) {
    console.log('🔍 Encrypted data detected, decrypting...');
    try {
      return await decrypt(value);
    } catch (error) {
      console.error('❌ Failed to decrypt API key, treating as plaintext:', error);
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

export async function testEncryption(): Promise<void> {
  console.log('\n🧪 === ENCRYPTION MODULE TEST ===\n');
  
  try {
    const testData = 'test-api-key-12345';
    console.log('📝 Original data:', testData);
    
    const encrypted = await encryptApiKey(testData);
    console.log('🔒 Encrypted data:', JSON.stringify(encrypted, null, 2));
    console.log('✅ Encryption successful!');
    
    const decrypted = await decryptApiKey(encrypted);
    console.log('🔓 Decrypted data:', decrypted);
    console.log('✅ Decryption successful!');
    
    if (testData === decrypted) {
      console.log('✅ VERIFICATION PASSED: Original matches decrypted');
    } else {
      console.error('❌ VERIFICATION FAILED: Data mismatch');
    }
    
    const plaintextResult = await decryptApiKey(testData);
    console.log('\n📝 Testing backward compatibility with plaintext...');
    console.log('🔓 Plaintext result:', plaintextResult);
    
    if (testData === plaintextResult) {
      console.log('✅ BACKWARD COMPATIBILITY PASSED');
    } else {
      console.error('❌ BACKWARD COMPATIBILITY FAILED');
    }
    
    console.log('\n✅ === ALL TESTS PASSED ===\n');
  } catch (error) {
    console.error('\n❌ === TEST FAILED ===');
    console.error('Error:', error);
    console.log('\nNote: Ensure ENCRYPTION_KEY environment variable is set to a valid 32-byte base64 string');
    console.log('You can generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'base64\'))"');
  }
}

export function generateEncryptionKey(): string {
  if (typeof window !== 'undefined') {
    const keyBytes = crypto.getRandomValues(new Uint8Array(32));
    return btoa(String.fromCharCode(...keyBytes));
  } else {
    const crypto = require('crypto');
    return crypto.randomBytes(32).toString('base64');
  }
}
