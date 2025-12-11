
import { z } from 'zod';

const publicEnvSchema = z.object({
  NEXT_PUBLIC_FIREBASE_API_KEY: z.string().optional(),
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: z.string().optional(),
  NEXT_PUBLIC_FIREBASE_DATABASE_URL: z.string().url('Firebase Database URL must be a valid URL').optional(),
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: z.string().optional(),
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: z.string().optional(),
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: z.string().optional(),
  NEXT_PUBLIC_FIREBASE_APP_ID: z.string().optional(),
  NEXT_PUBLIC_ENCRYPTION_KEY: z.string().optional(),
});

const serverEnvSchema = z.object({
  GOOGLE_GENAI_API_KEY: z.string().optional(),
  GEMINI_API_KEY: z.string().optional(),
  ENCRYPTION_KEY: z.string().optional(),
  CRON_SECRET: z.string().optional(),
  NODE_ENV: z.enum(['development', 'production', 'test']).optional().default('development'),
});

export type PublicEnv = z.infer<typeof publicEnvSchema>;
export type ServerEnv = z.infer<typeof serverEnvSchema>;

let validatedPublicEnv: PublicEnv | null = null;
let validatedServerEnv: ServerEnv | null = null;

export function validatePublicEnv(): PublicEnv {
  if (validatedPublicEnv) {
    return validatedPublicEnv;
  }

  try {
    validatedPublicEnv = publicEnvSchema.parse({
      NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
      NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      NEXT_PUBLIC_FIREBASE_DATABASE_URL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
      NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      NEXT_PUBLIC_FIREBASE_APP_ID: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
      NEXT_PUBLIC_ENCRYPTION_KEY: process.env.NEXT_PUBLIC_ENCRYPTION_KEY,
    });

    console.log('✅ Public environment variables validated successfully');
    return validatedPublicEnv;
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('❌ Environment validation failed:');
      error.errors.forEach((err) => {
        console.error(`  - ${err.path.join('.')}: ${err.message}`);
      });
      throw new Error(
        `Environment validation failed. Please check your .env file:\n${error.errors
          .map((err) => `  ${err.path.join('.')}: ${err.message}`)
          .join('\n')}`
      );
    }
    throw error;
  }
}

export function validateServerEnv(): ServerEnv {
  if (typeof window !== 'undefined') {
    throw new Error('validateServerEnv should only be called on the server');
  }

  if (validatedServerEnv) {
    return validatedServerEnv;
  }

  try {
    validatedServerEnv = serverEnvSchema.parse({
      GOOGLE_GENAI_API_KEY: process.env.GOOGLE_GENAI_API_KEY,
      GEMINI_API_KEY: process.env.GEMINI_API_KEY,
      ENCRYPTION_KEY: process.env.ENCRYPTION_KEY,
      CRON_SECRET: process.env.CRON_SECRET,
      NODE_ENV: process.env.NODE_ENV,
    });

    console.log('✅ Server environment variables validated successfully');
    return validatedServerEnv;
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('❌ Server environment validation failed:');
      error.errors.forEach((err) => {
        console.error(`  - ${err.path.join('.')}: ${err.message}`);
      });
      throw new Error(
        `Server environment validation failed. Please check your .env file:\n${error.errors
          .map((err) => `  ${err.path.join('.')}: ${err.message}`)
          .join('\n')}`
      );
    }
    throw error;
  }
}

export function getPublicEnv(): PublicEnv {
  return validatePublicEnv();
}

export function getServerEnv(): ServerEnv {
  return validateServerEnv();
}

export function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

export function isDevelopment(): boolean {
  return process.env.NODE_ENV !== 'production';
}
