# OmniFlow - All-in-One Sales & Marketing Platform

## Overview
OmniFlow is a Next.js SaaS platform designed as an all-in-one sales and marketing solution for Small and Medium-sized Enterprises (SMEs). It integrates CRM, multi-channel marketing (email, SMS, WhatsApp), AI-powered content generation, and campaign automation. The platform aims to be accessible and cost-effective through free-tier tools, user-friendly design, and a "Bring Your Own Key" (BYOK) model for unlimited AI capabilities. Key features include an AI Campaign Studio for natural language-driven multi-channel campaign creation and a Digital Card builder with an AI Voice Chatbot. The vision is to empower SMEs with enterprise-grade marketing tools at an affordable price, aspiring to become the top choice for budget-conscious SMEs by offering competitive pricing and superior AI.

## User Preferences
Preferred communication style: Simple, everyday language.

## CRITICAL BUSINESS STRATEGY (ALWAYS FOLLOW)
**DO NOT compete with giants like Google on free AI content/images/videos.**

Focus ONLY on features that:
1. **Solve real business problems** - Not just cool tech demos
2. **Customers actually use and PAY for** - Revenue-generating features
3. **Are commonly used in competitors** - Proven market demand
4. **Make customers STICK to OmniFlow** - High switching cost, daily use
5. **Bring actual money** - Not vanity metrics

**What NOT to prioritize:**
- Free AI image generators (Google, Canva, etc. already do this)
- Free AI content writers (ChatGPT, Claude already do this)
- Free AI video generators (Too expensive, giants dominate)

**What TO prioritize:**
- Features that save time in daily business operations
- Automation that runs without human intervention
- CRM + Marketing integration (the "glue" that competitors charge for)
- Multi-channel campaign management (email + SMS + WhatsApp together)
- Lead capture and conversion tracking
- Team collaboration and management
- Business intelligence and ROI tracking

**Competitive Benchmark:**
Compare against: GoHighLevel ($97-297/mo), HubSpot ($50-3200/mo), ActiveCampaign ($29-259/mo)
Our advantage: All-in-one at fraction of cost + BYOK for unlimited AI

## PRIORITY FEATURES & DECISION CRITERIA

### HIGH PRIORITY: White-Label for Enterprise
- **Status:** Priority feature - can bring 2-3x revenue
- **Why:** Agencies/resellers pay $497-799/mo for white-label
- **OmniFlow is 70% ready** - just needs branding customization
- Build this after core features are stable

### Feature Suggestion Criteria (MUST FOLLOW)
Before suggesting ANY new feature, it MUST pass ALL these checks:
1. **Practically usable** - Not just a cool demo, solves real business problem
2. **Competitive pricing possible** - We can offer cheaper than alternatives
3. **NOT easily available** - Can't be found free or built overnight
4. **Actually brings money** - Proven revenue potential, customers pay for this

### What NOT to Suggest:
- Features available free elsewhere (AI images, AI content writers)
- Vanity features that don't generate revenue
- Complex features with low ROI
- Features competitors give away free

### Current Known Issues (Fix Later):
- **Email sending not working** - Fix LAST after all features are complete
- Focus on getting ALL features working first before debugging email

### Revenue-Priority Features:
1. White-Label (Enterprise) - 2-3x revenue potential
2. Multi-channel campaigns (Email + SMS + WhatsApp)
3. CRM + Automation workflows
4. Team management (per-user pricing)
5. SMS/WhatsApp credits (per-message revenue)

## System Architecture

### UI/UX
The platform is built with Next.js 15 (App Router, React Server Components), utilizing shadcn/ui (Radix UI) and Tailwind CSS for a responsive design with light/dark modes. The design emphasizes a guided, AI-driven workflow and tab-based categorization for settings and API integrations.

### Technical Implementations
- **Backend**: Next.js Server Actions manage server-side operations.
- **Authentication & Authorization**: Firebase Authentication and Admin SDK with Role-Based Access Control (RBAC) and feature flags tied to subscription plans.
- **Data Architecture**: Multi-tenant Firebase Firestore, scoping data by `companyId`. API keys are secured using AES-GCM encryption.
- **AI Integration**: Google Genkit orchestrates LLM workflows, incorporating Gemini 2.0 Flash, Imagen 4, and Gemini TTS for multi-channel marketing content, ad copy, business strategy, and image generation. Server-side tracking of AI usage, costs, and quotas, with unlimited AI via "Bring Your Own Key" (BYOK).
- **Voice Chat AI**: SEPARATE PRODUCT - Integrated via external widget (voicechatai.wmart.in). Already has all features including 109 languages, live voice chat, and lead capture. Configured in Settings → API Integrations. DO NOT rebuild - just integrate. The TTS feature in OmniFlow is DIFFERENT - it's for generating audio content (voice-overs, narrations) for marketing, not live chat.
- **AI Campaign Studio**: A three-stage wizard facilitates AI-first, natural language-driven campaign creation.
- **Automation**: Event-driven email automation and a centralized queue for bulk email, SMS, and WhatsApp campaigns with retry logic via cron jobs.
- **WhatsApp Marketing**: Supports free `wa.me` links for text-only messages and Business APIs for automated sending with image + text.
- **Routing & Caching**: Middleware handles public and protected routes; a service worker prevents caching of private routes.
- **Pricing Strategy**: Geo-detection auto-detects user country and currency, supporting fixed regional pricing with automatic payment gateway selection. An AI credit system tracks AI usage.
  - **Fixed Regional Pricing**: India uses fixed INR prices (₹1,999/₹7,999/₹20,999), international uses USD ($29/$99/$249)
  - **Billing Cycles**: Monthly and yearly options with tiered discounts (15%/20%/25%)
  - **Gateway Selection**: Razorpay for India (INR), Stripe for international (USD/EUR/GBP)
  - **Price Consistency**: Payment buttons display exact amounts charged by gateway (no conversion discrepancies)
- **SMS Campaign Processing**: Bulk SMS support with auto-routing, DLT templates, and per-recipient variable personalization.
- **Image Storage**: Images for campaigns, blogs, and social media are uploaded to ImgBB to reduce server load.
- **CRM Enhancements**: Includes an activity timeline, deal/opportunity management, an improved onboarding flow, and a comprehensive dashboard.
- **CRM-Appointment Integration**: Unified appointment scheduling across the entire CRM:
  - Schedule appointments directly from contact details, lead tables, tasks, and pipeline views
  - Appointments link to contacts via `clientId` and email for reliable association
  - Cal.com frontend bookings automatically link to existing CRM contacts by email lookup
  - Appointments tab in lead detail page shows all appointments for a contact
  - API endpoint `/api/appointments/contact` for authenticated appointment fetching by contact
- **Team Collaboration (50+ Users)**: Enterprise-grade team features including:
  - Server-side role-based lead filtering (sales reps see only assigned leads)
  - Lead tabs (My Leads / All Leads / Unassigned) for managers
  - Bulk lead assignment dialog with team member selection
  - Manager team performance dashboard with per-rep metrics
  - Activity logging for lead assignments
  - Secure authorization checks on all team operations
- **Enterprise Features for 50+ Users** (gated by `feat_enterprise_team` feature flag):
  - **Real-time Lead Claiming**: Transaction-based system prevents two reps from editing the same lead simultaneously. 30-minute auto-expiring claims with extend/release functionality.
  - **Comprehensive Audit Trail**: Full logging of all CRM actions (create, update, delete, assign, claim, export, import) with severity levels, user tracking, and export capability for compliance.
  - **Auto-Distribution**: Fair lead assignment using round-robin, load-balanced, or random methods. Configurable eligible roles and max leads per rep.
  - **Enterprise Settings Page**: Admin-only settings at `/settings/enterprise` with tabs for auto-distribution config, audit log viewer, and SSO information.
  - **SSO Ready**: Firebase Auth supports Google, GitHub, Microsoft, Apple. Enterprise SAML/OIDC available for Okta, Azure AD, Google Workspace on request.
- **Feature Flags System**: Plan-based feature gating with these defined flags:
  - `feat_core_crm`: Leads, Contacts, Pipeline, Task Management, Appointments/Calendar, Team Management (all paid plans)
  - `feat_email_marketing`: Email campaigns and automation (Starter+)
  - `feat_sms_whatsapp`: SMS and WhatsApp marketing (Pro+)
  - `feat_ai_content_gen`: Content Factory and AI generators (all plans)
  - `feat_ai_ads_manager`: Ad copy and creative generator (Pro+)
  - `feat_digital_cards`: Digital business cards with Voice AI (all plans)
  - `feat_enterprise_team`: Lead claiming, audit trail, auto-distribution (Enterprise only)

### System Design Choices
- **Campaign Architecture**: Prioritizes single-channel campaigns for performance, compliance, and cost optimization, allowing draft reuse.
- **Bulk Email**: Utilizes Campaign API for Brevo and Sender.net for enhanced analytics and deliverability.
- **SMS Template Management**: Templates are managed with automatic DLT Template ID abstraction, variable detection, and real-time previews.
- **Image Upload Strategy**: All images are uploaded to ImgBB via server-side action.
- **WhatsApp Messaging Strategy**: `wa.me` for free, manual text-only sends; Business APIs for paid, automated image+text combined messages.
- **Performance Optimizations**: Implemented Firestore indexes for server-side sorting, dynamic imports for heavy components, lazy provider loading, and batch cost queries to enhance application speed and responsiveness.

## External Dependencies

### Core Infrastructure
- **Firebase**: Authentication, Firestore.
- **Next.js 15**: Web framework.
- **React 18**: UI library.

### UI & Styling
- **Tailwind CSS**: Styling.
- **shadcn/ui**: Component library.
- **Lucide React**: Icons.
- **Recharts**: Data visualization.

### AI & Automation
- **Google Genkit**: AI orchestration.
- **@genkit-ai/googleai**: Gemini model integration.

### Third-Party API Integrations

#### Image Services
- **ImgBB API**: Image hosting.

#### Email Services
- **Sender.net API**
- **Brevo API**
- **Custom SMTP**: Amazon SES, SMTP2GO, Gmail SMTP.

#### WhatsApp Business Platforms
- **Gupshup API**
- **WMart CPaaS API** (our all-in-one communication platform at wmart.in/cpaas)
- **AiSensy API**
- **MSG91 WhatsApp API**
- **Fast2SMS WhatsApp API**
- **Meta WhatsApp Cloud API**

#### SMS Platforms
- **MSG91 SMS API**
- **Fast2SMS API**
- **Twilio SMS API**

#### CRM Systems
- **HubSpot API**
- **Zoho CRM API**
- **Bitrix24 API**

#### Payment Gateways
- **Stripe**: International payments.
- **Razorpay**: India payments.

#### Utilities
- **exchangerate-api.com**: Currency exchange rates.
- **ipapi.co**: Geo-detection.
- **Cal.com API**: For appointment booking.

#### Voice Chat AI (SEPARATE PRODUCT - DO NOT REBUILD)
- **voicechatai.wmart.in**: External Voice AI product integrated via widget script
  - **Pricing Tiers:**
    - Free: 1 language (English only), 30 conversations/month
    - Starter (₹999/mo): 10 languages, 300 conversations/month
    - Pro (₹4999/mo): 109+ languages, 3000 conversations/month
  - Live voice chat with AI (already built-in)
  - Lead capture functionality (already built-in)
  - Configured in OmniFlow via Settings → API Integrations
  - Works with Digital Cards feature
  - Note: OmniFlow's TTS feature is for audio content generation (voice-overs), NOT live chat

## Project Documentation

### Master Reference
- **OMNIFLOW_MASTER_DOCUMENTATION.md**: Single source of truth containing all essential project information including:
  - Platform overview and current status
  - User roles and access levels
  - Complete feature inventory
  - Implementation roadmap and priorities
  - External dependencies and APIs
  - Technical architecture details
  - API quick reference
  - UX guidelines and testing checklist
  - Session reminder prompts

- **MESSAGING_PLATFORMS_GUIDE.md**: Critical step-by-step implementation guide for:
  - WhatsApp Business API (WATI, AiSensy, Meta Cloud API)
  - Bulk SMS platforms (MSG91, 2Factor.in, Fast2SMS)
  - API endpoints, database schemas, UI/UX guidelines
  - Testing checklists and success metrics

### Technical Documentation (docs/)
- **Security**: `docs/OWASP_SECURITY_CHECKLIST.md`, `scripts/security-scan.sh`
- **Testing**: `docs/USER_JOURNEY_TESTING.md`, `docs/STRESS_TEST_GUIDE.md`
- **Payments**: `docs/PAYMENT_VERIFICATION_GUIDE.md`
- **API Reference**: `docs/API_QUICK_REFERENCE.md`
- **User Help**: `docs/USER_HELP_ARTICLES.md`
- **Backup**: `docs/BACKUP_DISASTER_RECOVERY.md`, `scripts/firestore-backup.sh`

### Documentation Cleanup (December 2024)
Consolidated 128 individual documentation files into one master document to improve maintainability and reduce file count. The `attached_assets` folder was cleaned from 50MB to 1.4MB by removing old conversation screenshots.