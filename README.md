# OmniFlow - Business Automation Platform

OmniFlow is a comprehensive SaaS platform for business automation, combining CRM, email marketing, SMS/WhatsApp campaigns, AI-powered content generation, and multi-platform lead synchronization.

## Features

- **Multi-tenant Architecture**: Company-scoped data with role-based access control
- **CRM Integration**: Sync with HubSpot, Bitrix24, and Zoho CRM
- **Email Marketing**: Automated campaigns with Brevo integration
- **AI Content Generation**: Powered by Google Gemini for social media, ads, and emails
- **SMS & WhatsApp**: Twilio integration for messaging campaigns
- **Email Automation**: Event-driven automation with state tracking
- **Analytics & Reporting**: Track campaign performance and lead conversions

## Tech Stack

- **Frontend**: Next.js 15 with App Router, React 18, TypeScript
- **UI**: Tailwind CSS, shadcn/ui (Radix UI)
- **Backend**: Next.js Server Actions
- **Database**: Firebase Firestore
- **Authentication**: Firebase Auth
- **AI**: Google Genkit with Gemini 2.0 Flash, Imagen 3, Gemini TTS
- **State Management**: TanStack Query, React Context

## Getting Started

### Prerequisites

- Node.js 18 or higher
- Firebase project with Firestore enabled
- Google Cloud project with Gemini API enabled

### Environment Variables

Create a `.env.local` file with the following variables:

```env
# Firebase Configuration (Required)
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
NEXT_PUBLIC_FIREBASE_DATABASE_URL=https://your_project.firebaseio.com

# AI Configuration (Required - at least one)
GEMINI_API_KEY=your_gemini_api_key
# OR
GOOGLE_GENAI_API_KEY=your_gemini_api_key

# Google Cloud Project ID (Required for Imagen 3, TTS, Video)
GOOGLE_CLOUD_PROJECT_ID=your_project_id

# Security (Optional but Recommended)
ENCRYPTION_KEY=your_base64_encoded_32_byte_key
NEXT_PUBLIC_ENCRYPTION_KEY=your_base64_encoded_32_byte_key

# Automation (Optional)
CRON_SECRET=your_long_random_secret_for_cron_jobs

# Environment
NODE_ENV=development
```

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

Open [http://localhost:5000](http://localhost:5000) to view the application.

### Firebase Setup

1. Create a Firebase project at [https://console.firebase.google.com](https://console.firebase.google.com)
2. Enable Firestore Database
3. Enable Authentication with Email/Password provider
4. Copy your Firebase configuration to `.env.local`

### Deploy Firestore Security Rules

```bash
firebase deploy --only firestore:rules
```

The `firestore.rules` file contains comprehensive multi-tenant security rules that enforce company isolation and role-based access control.

## Production Deployment

### Pre-Deployment Checklist

1. **Environment Variables**: Ensure all required environment variables are set in your production environment
2. **Firebase Configuration**: Verify Firebase project is in production mode
3. **Security Rules**: Deploy Firestore security rules
4. **Encryption Key**: Generate a secure 32-byte encryption key for API key storage
5. **Cron Secret**: Set a strong random secret for cron job authentication

### Deployment Steps

#### 1. Environment Configuration

Set all required environment variables in your hosting platform:

```bash
# Verify environment variables
curl https://your-domain.com/api/health
```

The health check endpoint will report the status of:
- Firebase connectivity
- Encryption key availability
- Cron secret configuration

#### 2. Deploy Firestore Security Rules

```bash
# Install Firebase CLI if not already installed
npm install -g firebase-tools

# Login to Firebase
firebase login

# Deploy security rules
firebase deploy --only firestore:rules
```

#### 3. Generate Encryption Key

```bash
# Generate a secure 32-byte encryption key
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Add this as `ENCRYPTION_KEY` in your production environment.

#### 4. Configure Cron Jobs for Email Automations

**📖 Complete Setup Guides:**
- **Quick Start** (5 minutes): See `docs/CRON-QUICK-START.md`
- **Detailed Guide** (All options): See `docs/automation-scheduling-setup.md`
- **Admin Testing Page**: Visit `/settings/automation-testing` after deployment

**Quick Options:**
1. **Google Cloud Scheduler** (recommended for Firebase hosting) - FREE for first 3 jobs
2. **External Service** (cron-job.org, EasyCron) - FREE tier available
3. **Vercel Cron** (if deploying to Vercel) - FREE on all plans

**Example using external service:**
```bash
# URL: https://your-domain.com/api/run-automations
# Schedule: Every 5 minutes
# Header: Authorization: Bearer YOUR_CRON_SECRET
```

The guides above provide step-by-step instructions for each option.

#### 5. Build and Deploy

```bash
# Build the application
npm run build

# Deploy to your hosting platform
# For Vercel:
vercel --prod

# For Replit:
# Click "Publish" and configure autoscale deployment
```

### Post-Deployment Verification

1. **Health Check**: Visit `/api/health` to verify all services are operational
2. **Firebase Connection**: Check that Firestore queries work correctly
3. **Authentication**: Test user login and registration
4. **Security Rules**: Verify multi-tenant isolation works
5. **Automation**: Confirm cron job endpoint is accessible and secure
6. **Encryption**: Test API key encryption/decryption

### Monitoring & Health Checks

#### Health Check Endpoint

The `/api/health` endpoint provides system health status:

```bash
curl https://your-domain.com/api/health
```

Response:
```json
{
  "status": "healthy",
  "timestamp": "2025-10-18T12:00:00.000Z",
  "environment": "production",
  "services": {
    "firebase": true,
    "encryption": true,
    "cron": true
  },
  "uptime": 3600
}
```

Status codes:
- `200`: All services healthy
- `503`: One or more services degraded

### Security Considerations

1. **Multi-Tenant Isolation**: Firestore security rules enforce company-level data isolation
2. **Role-Based Access**: SuperAdmin, Admin, Manager, and User roles with appropriate permissions
3. **API Key Encryption**: All third-party API keys are encrypted at rest using AES-GCM
4. **Cron Authentication**: Automation endpoint requires bearer token authentication
5. **Rate Limiting**: Email automation includes quota limits and circuit breakers
6. **Environment Validation**: Zod schemas validate all environment variables at startup

### Troubleshooting

#### Health Check Fails

- Verify all environment variables are set correctly
- Check Firebase project configuration
- Ensure Firestore is enabled and accessible

#### Authentication Issues

- Verify Firebase Auth is enabled
- Check that Email/Password provider is configured
- Ensure auth domain is correctly set

#### Automation Not Running

- Verify CRON_SECRET is set and matches your cron job
- Check that `/api/run-automations` endpoint is accessible
- Review application logs for errors

#### Multi-Tenant Issues

- Ensure Firestore security rules are deployed
- Verify users have correct `companyId` in their profile
- Check that queries include company filters

## Google AI Features (2025 API Update)

This application has been updated to use Google's latest 2025 API for multimodal AI capabilities:

### Image Generation (Imagen 3)

Generate high-quality images from text prompts using the latest Imagen 3 API.

**Features:**
- Multiple aspect ratios: 1:1, 3:4, 4:3, 9:16, 16:9
- Auto-detection of aspect ratio from prompt keywords
- Safety filters and content controls
- Billing required on Google Cloud project

**Usage:**
```typescript
import { generateImageWithAiFlow } from '@/ai/flows/generate-image-with-ai-flow';

const result = await generateImageWithAiFlow({
  prompt: "A majestic lion in square aspect ratio",
  aspectRatio: "1:1" // Optional, auto-detected if not provided
});

// result.imageDataUri contains the base64 image data
```

**Setup Requirements:**
1. Create API key at [Google AI Studio](https://aistudio.google.com/)
2. Enable billing on your Google Cloud project
3. Add `GEMINI_API_KEY` to Replit Secrets
4. Add `GOOGLE_CLOUD_PROJECT_ID` to Replit Secrets

**Cost:** $0.03 per image (as of 2025)

### Text-to-Speech (Gemini TTS)

Convert text to natural-sounding speech with emotion and style control.

**Features:**
- Multiple voices: Kore, Puck, Leda, Callirhoe, Orus
- Style control: cheerful, dramatic, whisper, etc.
- Multi-speaker support
- 24kHz audio quality

**Usage:**
```typescript
import { generateTTSWithAiFlow } from '@/ai/flows/generate-tts-with-ai-flow';

const result = await generateTTSWithAiFlow({
  text: "Have a wonderful day!",
  voiceName: "Kore", // Optional, defaults to Kore
  style: "cheerfully" // Optional
});

// result.audioDataUri contains the base64 audio data
```

**Available Voices:**
- **Kore**: Balanced, professional
- **Puck**: Energetic, playful
- **Leda**: Warm, friendly
- **Callirhoe**: Elegant, sophisticated
- **Orus**: Deep, authoritative

### Video Generation (Veo - Coming Soon)

Video generation using Google Veo requires advanced Vertex AI setup with OAuth2 authentication.

**Current Status:** Implementation requires service account setup and is marked for future enhancement.

**To enable:**
1. Enable Vertex AI API in Google Cloud Console
2. Create service account with Vertex AI permissions
3. Set up OAuth2 authentication flow

For now, use Google Cloud Console UI for video generation:
https://console.cloud.google.com/vertex-ai/generative/video

### API Migration Notes

This application has been migrated from the deprecated Vertex AI Imagen API to the new 2025 endpoints:

**Old API (Deprecated):**
- Endpoint: `imagegeneration:predict`
- Authentication: Bearer token (OAuth2)
- Status: Removed September 24, 2025

**New API (Current):**
- Endpoint: `imagen-3.0-generate-001:predict`
- Authentication: API key
- Model: Imagen 3 with enhanced quality

**What Changed:**
- Simpler API key authentication (no OAuth2 needed)
- Better image quality and prompt following
- Support for multiple aspect ratios
- Integrated TTS capabilities
- Unified pricing model

### Google Cloud Setup Guide

1. **Create/Select Project**
   - Visit [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select existing (e.g., "OmniFlow")

2. **Enable Billing**
   - Go to Billing section
   - Link a billing account
   - Required for image generation and TTS

3. **Get API Key**
   - Visit [Google AI Studio](https://aistudio.google.com/)
   - Create new API key
   - Copy to Replit Secrets as `GEMINI_API_KEY`

4. **Copy Project ID**
   - Find in Google Cloud Console
   - Copy to Replit Secrets as `GOOGLE_CLOUD_PROJECT_ID`

5. **Test Features**
   - Use image generation in your app
   - Try TTS with different voices
   - Monitor usage in Google Cloud Console

### Troubleshooting Google AI

**Error: "Billing required"**
- Enable billing at https://console.cloud.google.com/billing
- Link a valid payment method to your project

**Error: "API key invalid"**
- Regenerate API key at Google AI Studio
- Update `GEMINI_API_KEY` in Replit Secrets
- Restart the workflow

**Error: "Quota exceeded"**
- Check quota limits in Google Cloud Console
- Upgrade to higher tier if needed
- Wait for quota reset (usually daily)

**Images not generating**
- Verify `GOOGLE_CLOUD_PROJECT_ID` is set correctly
- Check that billing is enabled
- Review console logs for detailed error messages

## Documentation

For detailed architecture and development information, see [replit.md](./replit.md).

## Support

For issues or questions, please check:
- Project documentation in `replit.md`
- Firebase Console for database and auth status
- Application logs for error details
- Health check endpoint for service status

## License

Proprietary - OmniFlow Business Automation Platform
