export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { validatePublicEnv, validateServerEnv } = await import('./config/env');
    
    try {
      console.log('🔍 Validating environment variables...');
      validatePublicEnv();
      validateServerEnv();
      console.log('✅ All environment variables validated successfully');
    } catch (error) {
      console.error('❌ Environment validation failed:', error);
      throw error;
    }
  }
}
