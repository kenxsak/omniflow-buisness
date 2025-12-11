# OmniFlow Developer Setup Guide

## Prerequisites

- Node.js 18+ (recommended: 20.x)
- Firebase account with Firestore enabled
- npm or yarn package manager

## Quick Start

1. Clone the repository and install dependencies:
```bash
npm install
```

2. Set up environment variables (see Environment Variables section below)

3. Start the development server:
```bash
npm run dev
```

4. Open [http://localhost:5000](http://localhost:5000) in your browser

## Environment Variables

Create a `.env.local` file with the following variables:

### Firebase Configuration (Required)
```
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

### Firebase Admin SDK (Required for server functions)
```
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_CLIENT_EMAIL=your_service_account_email
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

### AI/Google Gemini (Optional)
```
GOOGLE_API_KEY=your_gemini_api_key
```

### Email/SMS Services (Optional)
```
BREVO_API_KEY=your_brevo_api_key
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_token
TWILIO_PHONE_NUMBER=+1234567890
```

### Payment Gateways (Optional)
```
STRIPE_SECRET_KEY=your_stripe_secret
STRIPE_WEBHOOK_SECRET=your_webhook_secret
RAZORPAY_KEY_ID=your_razorpay_key
RAZORPAY_KEY_SECRET=your_razorpay_secret
```

## Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── (dashboard)/       # Authenticated routes
│   ├── (auth)/            # Authentication routes
│   ├── actions/           # Server actions
│   └── api/               # API routes
├── components/
│   ├── ui/                # Base UI components (shadcn/ui)
│   ├── crm/               # CRM-specific components
│   ├── onboarding/        # Onboarding components
│   └── ...
├── lib/
│   ├── firebase.ts        # Firebase client config
│   ├── firebase-server.ts # Firebase server config
│   ├── firebase-admin.ts  # Firebase Admin SDK
│   ├── security/          # Rate limiting, validation
│   ├── cost-tracking/     # Usage tracking
│   └── crm/               # CRM utilities
├── hooks/                 # React hooks
├── types/                 # TypeScript types
└── docs/                  # Documentation
```

## Key Technologies

- **Framework**: Next.js 15 with App Router
- **UI**: shadcn/ui + Tailwind CSS
- **Database**: Firebase Firestore
- **Authentication**: Firebase Auth
- **AI**: Google Gemini via Genkit
- **State Management**: React Query (TanStack Query)
- **Forms**: React Hook Form + Zod validation
- **Charts**: Recharts

## Available Scripts

```bash
# Development
npm run dev           # Start development server on port 5000

# Build
npm run build         # Build for production
npm run start         # Start production server

# Analysis
ANALYZE=true npm run build  # Analyze bundle size

# Firebase
firebase deploy --only firestore:indexes  # Deploy Firestore indexes
```

## Development Workflow

### Adding a New Feature

1. Create types in `src/types/`
2. Create server actions in `src/app/actions/`
3. Create UI components in `src/components/`
4. Add routes in `src/app/(dashboard)/`
5. Update documentation

### Adding a New Server Action

```typescript
// src/app/actions/example-actions.ts
'use server';

import { serverDb } from '@/lib/firebase-server';
import { collection, addDoc, Timestamp } from 'firebase/firestore';

export async function createExample(data: ExampleInput) {
  if (!serverDb) {
    return { success: false, error: 'Database not initialized' };
  }

  try {
    const docRef = await addDoc(collection(serverDb, 'examples'), {
      ...data,
      createdAt: Timestamp.now(),
    });
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error('Error:', error);
    return { success: false, error: 'Operation failed' };
  }
}
```

### Adding a New Component

```typescript
// src/components/feature/my-component.tsx
'use client';

import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface MyComponentProps {
  title: string;
  onAction: () => void;
}

export function MyComponent({ title, onAction }: MyComponentProps) {
  return (
    <Card>
      <h2>{title}</h2>
      <Button onClick={onAction}>Action</Button>
    </Card>
  );
}
```

## Firestore Indexes

Indexes are defined in `firestore.indexes.json`. Deploy with:
```bash
firebase firestore:indexes:update
```

## Debugging

### Common Issues

1. **"Database not initialized"**
   - Check Firebase environment variables
   - Verify Firebase project settings

2. **"Unauthorized" errors**
   - Check Firebase rules in console
   - Verify authentication token

3. **Rate limiting errors**
   - Wait for rate limit window to reset
   - Check `src/lib/security/rate-limiter.ts` for limits

### Logging

Server-side logs appear in terminal. Client-side logs in browser console.

For production debugging, check Vercel/hosting provider logs.

## Testing

### Manual Testing Checklist
See `docs/QA-CHECKLIST.md` for comprehensive testing guide.

## Deployment

### Vercel (Recommended)
1. Connect GitHub repository
2. Configure environment variables
3. Deploy

### Other Platforms
Ensure the platform supports Next.js 15 and serverless functions.

## Contributing

1. Create feature branch from `main`
2. Make changes
3. Test thoroughly
4. Submit PR with description

## Support

For issues, check existing documentation or contact the development team.
