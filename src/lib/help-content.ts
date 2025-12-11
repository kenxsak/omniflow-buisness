import { LucideIcon, PlusCircle, FileUp, Users, Mail, Send, MessageSquare, CreditCard, Lightbulb, BarChart } from 'lucide-react';

export type PageId =
  | 'dashboard'
  | 'crm'
  | 'crm-integrations'
  | 'tasks'
  | 'content-writer'
  | 'content-hub'
  | 'ad-copy-generator'
  | 'templates'
  | 'email-campaigns'
  | 'email-create-campaign'
  | 'email-automations'
  | 'email-subscribers'
  | 'text-messages'
  | 'text-send'
  | 'whatsapp'
  | 'whatsapp-bulk-campaigns'
  | 'sms-bulk-campaigns'
  | 'digital-cards'
  | 'digital-card-create'
  | 'smart-chat'
  | 'ai-chat'
  | 'sms-marketing'
  | 'social-media'
  | 'onboarding'
  | 'get-started'
  | 'my-team'
  | 'settings'
  | 'business-reports';

interface QuickAction {
  label: string;
  icon?: LucideIcon;
  onClick: () => void;
}

interface FAQ {
  question: string;
  answer: string;
}

interface HelpContent {
  pageTitle: string;
  overview?: string;
  capabilities: string[];
  quickActions?: QuickAction[];
  videoUrl?: string;
  videoTitle?: string;
  videoDuration?: string;
  tips?: string[];
  faqs?: FAQ[];
}

export const helpContent: Record<PageId, HelpContent> = {
  dashboard: {
    pageTitle: 'Dashboard',
    overview: 'This is your home base - a quick snapshot of how your business is doing. See your contact count, message stats, and what\'s working best, all in one place.',
    capabilities: [
      'See a quick overview of your business performance',
      'Check how many contacts you have and recent activity',
      'View your latest email and text message results',
      'Track your smart tools usage this month'
    ],
    quickActions: [
      {
        label: 'Add Contact',
        icon: PlusCircle,
        onClick: () => (window.location.href = '/crm')
      },
      {
        label: 'Send Email',
        icon: Mail,
        onClick: () => (window.location.href = '/email-marketing/create-campaign')
      }
    ],
    tips: [
      'Check your dashboard daily to stay on top of your business',
      'The numbers update automatically as you work',
      'Click on any card to see more detailed information'
    ],
    faqs: [
      {
        question: 'What do the numbers on each card mean?',
        answer: 'Each card shows a different metric: Total Contacts is everyone in your list, Smart Tools Usage shows how many AI credits you\'ve used this month, Email Campaigns shows your sent campaigns, and Engagement tracks how people interact with your messages.'
      },
      {
        question: 'How often does the dashboard update?',
        answer: 'Your dashboard updates automatically whenever you send messages, add contacts, or use any feature. Just refresh the page to see the latest numbers.'
      },
      {
        question: 'What if I\'m running low on Smart Tools credits?',
        answer: 'You\'ll see a warning when you\'ve used 80% of your monthly quota. You can upgrade your plan in Settings to get more credits and keep using AI features.'
      }
    ]
  },

  'business-reports': {
    pageTitle: 'Business Reports',
    overview: 'Track how your business is growing month by month. See your revenue, sales trends, and which products or services are selling best.',
    capabilities: [
      'Track your revenue and business growth over time',
      'See detailed charts of your sales performance',
      'Compare this month to previous months'
    ],
    tips: [
      'Use the date filters to view different time periods',
      'Export reports to share with your team or accountant',
      'Look at the trends to see what\'s working and what needs improvement'
    ],
    faqs: [
      {
        question: 'How far back can I view my reports?',
        answer: 'You can view reports from the day you started using OmniFlow. Use the date filter to select any time period you want to analyze.'
      },
      {
        question: 'Can I download these reports?',
        answer: 'Yes! Click the Export button to download your reports as a PDF or Excel file that you can share with your accountant or team.'
      }
    ]
  },

  crm: {
    pageTitle: 'My Contacts',
    overview: 'Your contact list - everyone who might become a customer. Add people manually, import from a file, or organize them into groups. This is where you keep track of all the people interested in your business.',
    capabilities: [
      'Add people who might buy from you',
      'Import contacts from a spreadsheet (Excel or CSV)',
      'Organize people by how interested they are',
      'Sync contacts to Brevo/HubSpot to keep external tools updated',
      'Add selected contacts to WhatsApp/SMS lists for bulk messaging'
    ],
    quickActions: [
      {
        label: 'Add Someone',
        icon: PlusCircle,
        onClick: () => {
          const addButton = document.querySelector('[data-action="add-contact"]') as HTMLElement;
          addButton?.click();
        }
      },
      {
        label: 'Import from File',
        icon: FileUp,
        onClick: () => {
          const importButton = document.querySelector('[data-action="import-contacts"]') as HTMLElement;
          importButton?.click();
        }
      }
    ],
    tips: [
      'Import contacts from Excel - just make sure you have Name and Email columns',
      'Add notes to remember important details about each person',
      'Use tags to organize contacts (like "VIP Customer" or "Interested in Product A")',
      'Only contacts with valid phone numbers can receive text messages or WhatsApp'
    ],
    faqs: [
      {
        question: 'How do I import contacts from Excel or CSV?',
        answer: 'Click "Import from File" button, select your Excel or CSV file, then map the columns (Name, Email, Phone, etc.). The file should have column headers in the first row.'
      },
      {
        question: 'What\'s the difference between "Sync to Brevo" and "Add to WhatsApp List"?',
        answer: 'Syncing pushes contacts FROM OmniFlow TO external tools like Brevo/HubSpot to keep them updated. "Add to WhatsApp/SMS List" prepares contacts for bulk messaging campaigns within OmniFlow.'
      },
      {
        question: 'Can I send messages to contacts who don\'t have phone numbers?',
        answer: 'You can send them emails, but not text messages or WhatsApp. Make sure phone numbers include the country code (+1 for US, +91 for India, etc.).'
      },
      {
        question: 'How do I organize my contacts by interest level?',
        answer: 'Use the "Status" field - mark them as New, Contacted, Qualified, or Won. You can also add custom tags to group them however you like.'
      }
    ]
  },

  'crm-integrations': {
    pageTitle: 'Connect Other Tools',
    overview: 'Connect your existing tools like Brevo, HubSpot, or Zoho so all your contacts stay synced automatically. No more copying and pasting between different apps.',
    capabilities: [
      'Link your other contact management tools to OmniFlow',
      'Automatically sync contacts from other services',
      'Keep all your contacts in one place'
    ],
    tips: [
      'Connecting tools means you don\'t have to manually import contacts',
      'Your contacts will stay up-to-date automatically',
      'You\'ll need API keys from the other service - look in their Settings'
    ],
    faqs: [
      {
        question: 'Where do I find my API key for Brevo or HubSpot?',
        answer: 'Log into Brevo/HubSpot, go to Settings → API Keys, and copy the key. Then paste it into OmniFlow\'s connection settings.'
      },
      {
        question: 'Will my contacts sync both ways?',
        answer: 'It depends on the integration. Most sync FROM OmniFlow TO the other tool. Check the specific integration\'s description to see how it works.'
      }
    ]
  },

  tasks: {
    pageTitle: 'Task Management',
    capabilities: [
      'Create to-do items for yourself or your team',
      'Track which tasks are done and which need work',
      'Set reminders so you don\'t forget important things'
    ],
    tips: [
      'Check off tasks as you complete them to stay organized',
      'Add due dates to prioritize what to do first'
    ]
  },

  'content-writer': {
    pageTitle: 'Content Writer',
    capabilities: [
      'Let the computer write social media posts for you',
      'Create email messages automatically',
      'Generate blog articles and web page content'
    ],
    quickActions: [
      {
        label: 'Create Post',
        icon: PlusCircle,
        onClick: () => {
          const createButton = document.querySelector('[data-action="create-content"]') as HTMLElement;
          createButton?.click();
        }
      }
    ],
    tips: [
      'Just describe what you want to say, and the computer will write it for you',
      'You can edit the content after it\'s generated to make it perfect',
      'Save your favorite posts to reuse them later'
    ]
  },

  'content-hub': {
    pageTitle: 'Content Hub',
    capabilities: [
      'Browse all the content you\'ve created',
      'Reuse posts you\'ve written before',
      'Find old emails and messages quickly'
    ],
    tips: [
      'Use the search box to find specific content',
      'Copy and paste content to use it again'
    ]
  },

  'ad-copy-generator': {
    pageTitle: 'Ad Copy Generator',
    capabilities: [
      'Create advertising text for Google, Facebook, and other platforms',
      'Generate multiple ad variations to test',
      'Get suggestions for catchy headlines'
    ],
    tips: [
      'Describe your product or service clearly for best results',
      'Try generating a few different versions to see which one you like best'
    ]
  },

  templates: {
    pageTitle: 'Templates',
    capabilities: [
      'Browse pre-written email and text message templates',
      'Use ready-made messages to save time',
      'Customize templates for your business'
    ],
    tips: [
      'Templates are a great starting point - just edit them to fit your needs',
      'Save your edited templates to reuse them'
    ]
  },

  'email-campaigns': {
    pageTitle: 'Email Campaigns',
    overview: 'Send emails to your contact list and see how well they perform. Track who opened your emails, who clicked links, and what\'s working best.',
    capabilities: [
      'Send professional emails to your contact list',
      'See how many people opened your emails',
      'Track which emails got the most clicks',
      'View email history and performance over time'
    ],
    quickActions: [
      {
        label: 'Send New Email',
        icon: Mail,
        onClick: () => (window.location.href = '/email-marketing/create-campaign')
      }
    ],
    tips: [
      'Higher open rates mean your subject lines are working well',
      'Track which emails get the most clicks to learn what your audience likes',
      'Send test emails to yourself before sending to everyone'
    ],
    faqs: [
      {
        question: 'What is a contact group and do I need one?',
        answer: 'A contact group is a list of people who will receive your email. For example, "All Customers" or "Newsletter Subscribers". You create groups in the Email Subscribers section.'
      },
      {
        question: 'How do I know if my email was delivered?',
        answer: 'After sending, check the campaign details. You\'ll see Sent, Delivered, Opened, and Clicked counts. If Delivered is lower than Sent, some emails bounced (invalid addresses).'
      },
      {
        question: 'Why is my open rate low?',
        answer: 'Try improving your subject line - make it short, clear, and interesting. Also send at better times (Tuesday-Thursday, 9-11 AM works well for most businesses).'
      }
    ]
  },

  'email-create-campaign': {
    pageTitle: 'Create Email Campaign',
    overview: 'Create and send a professional email to your contacts. Write your message, choose who gets it, and send it now or schedule it for later.',
    capabilities: [
      'Send an email to your contacts',
      'Choose who receives the email (contact groups)',
      'Schedule emails to send later',
      'Preview how your email looks before sending'
    ],
    tips: [
      'Write a short, catchy subject line to get more people to open your email',
      'Test your email by sending it to yourself first',
      'Schedule emails for tomorrow morning (9-10 AM works well)',
      'Keep your message focused on one main point'
    ],
    faqs: [
      {
        question: 'How do I create an email if I don\'t have a contact group?',
        answer: 'Go to Email Marketing → Subscribers first and create a contact list. Add people to it, then come back here to send an email to that list.'
      },
      {
        question: 'Can I use the AI to write my email?',
        answer: 'Yes! Click the AI Content button and describe what you want to say. The AI will draft the email for you, then you can edit it to make it perfect.'
      },
      {
        question: 'What time should I schedule my email?',
        answer: 'Tuesday-Thursday at 9-11 AM usually gets the best results. Avoid Monday mornings (too busy) and Friday afternoons (weekend mode).'
      }
    ]
  },

  'email-automations': {
    pageTitle: 'Auto-Send Emails',
    overview: 'Set up emails that send automatically when something happens - like when someone signs up or abandons their cart. Save time and never miss a follow-up.',
    capabilities: [
      'Set up emails that send automatically',
      'Welcome new contacts with an automatic email',
      'Send follow-up emails without having to remember',
      'Create multi-step email sequences'
    ],
    tips: [
      'Set up a welcome email first - it\'s the easiest one',
      'Automated emails save you time and never forget to follow up',
      'Test your automation by adding yourself as a contact first'
    ],
    faqs: [
      {
        question: 'What are auto-messages and how do they work?',
        answer: 'Auto-messages are emails that send themselves when a trigger happens. For example, when someone joins your list, they automatically get a welcome email without you doing anything.'
      },
      {
        question: 'Can I edit the automated emails after setting them up?',
        answer: 'Yes! Click Configure on any automation to edit the emails, change timing, or turn it on/off. Your changes take effect immediately.'
      },
      {
        question: 'How do I know if my automations are working?',
        answer: 'Check the Status - it should say "Active". You can also add yourself as a test contact to see if you receive the automated emails.'
      }
    ]
  },

  'email-subscribers': {
    pageTitle: 'Email Subscribers',
    capabilities: [
      'View all your email contact lists',
      'See who has subscribed or unsubscribed',
      'Organize contacts into different groups'
    ],
    tips: [
      'Create different lists for different types of customers',
      'Respect unsubscribes - it keeps your emails more effective'
    ]
  },

  'text-messages': {
    pageTitle: 'Text Messages',
    capabilities: [
      'View all text messages you\'ve sent',
      'Check delivery status of your messages',
      'See message history with each contact'
    ],
    quickActions: [
      {
        label: 'Send New Message',
        icon: Send,
        onClick: () => (window.location.href = '/sms-marketing/send')
      }
    ],
    tips: [
      'Keep text messages short - people read them quickly',
      'Include a clear action (like "Reply YES to confirm")'
    ]
  },

  'text-send': {
    pageTitle: 'Send New Text Message',
    capabilities: [
      'Send a text message to your contacts',
      'Text one person or many people at once',
      'Schedule messages to send later'
    ],
    tips: [
      'Text messages should be under 160 characters for best results',
      'Always include your business name so people know who\'s texting',
      'Best times to send: 10 AM - 8 PM on weekdays'
    ]
  },

  whatsapp: {
    pageTitle: 'WhatsApp Messages',
    capabilities: [
      'Send messages through WhatsApp',
      'Reach contacts who prefer WhatsApp',
      'Send images and files through WhatsApp'
    ],
    tips: [
      'WhatsApp works great for international contacts',
      'You can send images, which isn\'t possible with regular text messages'
    ]
  },

  'whatsapp-bulk-campaigns': {
    pageTitle: 'WhatsApp Bulk Campaigns',
    overview: 'Send WhatsApp messages to hundreds or thousands of people at once. Perfect for announcements, promotions, or updates to your customer base.',
    capabilities: [
      'Send WhatsApp messages to hundreds or thousands of contacts at once',
      'Use approved templates for business messaging',
      'Track delivery and read status for each message',
      'Send personalized messages to contact lists'
    ],
    quickActions: [
      {
        label: 'Go to Settings',
        icon: CreditCard,
        onClick: () => (window.location.href = '/settings')
      }
    ],
    tips: [
      'First, connect WATI, AiSensy, or Meta WhatsApp in Settings → Integrations',
      'Add contacts to WhatsApp lists from your CRM using "Add to WhatsApp List" button',
      'Use approved templates - WhatsApp requires Meta approval for bulk messages',
      'Track delivery and read receipts in the "My Campaigns" tab'
    ],
    faqs: [
      {
        question: 'How do I send WhatsApp campaigns?',
        answer: 'Step 1: Connect a WhatsApp service (WATI/AiSensy) in Settings. Step 2: Add contacts to a WhatsApp list from CRM. Step 3: Create campaign, select template and contact list, then send.'
      },
      {
        question: 'What are approved templates and where do I get them?',
        answer: 'WhatsApp requires all business messages to use pre-approved templates. You create and submit templates in your WATI or AiSensy dashboard. Once Meta approves them (usually 24-48 hours), they appear here.'
      },
      {
        question: 'Why do my contacts need country codes?',
        answer: 'WhatsApp requires full international phone numbers. Use +91 for India, +1 for US, +44 for UK, etc. Without the country code, messages won\'t send.'
      },
      {
        question: 'How much does it cost to send WhatsApp messages?',
        answer: 'Costs depend on your WhatsApp provider (WATI/AiSensy) and recipient country. Check their pricing - usually a few cents per message. You\'ll see estimated costs before sending.'
      }
    ]
  },

  'sms-bulk-campaigns': {
    pageTitle: 'SMS Bulk Campaigns',
    overview: 'Send text messages to hundreds or thousands of people at once. Perfect for time-sensitive updates, promotions, or reminders.',
    capabilities: [
      'Send text messages to hundreds or thousands of contacts at once',
      'Track delivery status and costs for each campaign',
      'Send both promotional and transactional messages',
      'View estimated costs before sending'
    ],
    quickActions: [
      {
        label: 'Go to Settings',
        icon: CreditCard,
        onClick: () => (window.location.href = '/settings')
      }
    ],
    tips: [
      'First, connect MSG91 or Fast2SMS in Settings → Integrations',
      'Add contacts to SMS lists from your CRM using "Add to WhatsApp/SMS List"',
      'Keep messages under 160 characters to save money (longer = multiple SMS charges)',
      'View cost estimates before sending - typically ₹0.20-0.50 per message in India'
    ],
    faqs: [
      {
        question: 'How do bulk SMS campaigns work?',
        answer: 'Step 1: Connect MSG91 or Fast2SMS in Settings. Step 2: Add contacts to SMS list from CRM. Step 3: Write your message (under 160 characters), select your contact list, and send.'
      },
      {
        question: 'What is DLT and do I need it?',
        answer: 'DLT (Distributed Ledger Technology) is required by India\'s telecom rules for promotional SMS. Register your templates at MSG91\'s DLT portal. Transactional messages (like OTPs) don\'t need DLT.'
      },
      {
        question: 'How much do SMS messages cost?',
        answer: 'In India: ₹0.20-0.50 per message depending on provider. Each 160 characters = 1 SMS. A 320-character message costs double. You\'ll see the exact cost estimate before sending.'
      },
      {
        question: 'Can I send to international numbers?',
        answer: 'Yes, but costs are higher (₹2-5 per SMS depending on country). Make sure phone numbers include the country code (+1 for US, +91 for India, etc.).'
      }
    ]
  },

  'digital-cards': {
    pageTitle: 'Digital Business Cards',
    overview: 'Create a beautiful, shareable web page for your business or personal brand. Like a digital business card that you can send to anyone with a link or QR code.',
    capabilities: [
      'Create professional digital business cards',
      'Share your card with anyone via link or QR code',
      'Track who views your card and clicks your links',
      'Capture leads through built-in contact forms'
    ],
    quickActions: [
      {
        label: 'Create New Card',
        icon: CreditCard,
        onClick: () => (window.location.href = '/digital-card/create')
      }
    ],
    tips: [
      'Share your digital card link in email signatures and social media bios',
      'Print the QR code on business cards, flyers, or store windows',
      'Enable the contact form to capture leads automatically',
      'Check the analytics to see who\'s viewing your card'
    ],
    faqs: [
      {
        question: 'What are digital cards and why use them?',
        answer: 'A digital card is a mobile-friendly web page with your contact info, links, and business details. Share it via link or QR code instead of paper business cards. People can save your contact, visit your website, or message you instantly.'
      },
      {
        question: 'How do I share my digital card?',
        answer: 'Click Copy Link to share via email/text, or download the QR code to print on physical materials. Anyone who scans the QR or clicks the link sees your card.'
      },
      {
        question: 'Can I have multiple digital cards?',
        answer: 'Yes! Your plan determines how many cards you can create. Use different cards for different purposes - one for your business, one personal, etc.'
      },
      {
        question: 'How do I track who views my card?',
        answer: 'Each card shows view count, link clicks, and leads captured. Click on a card to see detailed analytics.'
      }
    ]
  },

  'digital-card-create': {
    pageTitle: 'Create Digital Card',
    overview: 'Build your digital business card step by step. Add your info, links, colors, and design - then share it with the world.',
    capabilities: [
      'Make a new digital business card',
      'Add your contact information and social media links',
      'Customize colors and design',
      'Add action buttons (WhatsApp, Email, Phone, Website)',
      'Enable contact form to capture leads'
    ],
    tips: [
      'Choose a simple username (like "john-smith" or "cafe-mumbai") for your card URL',
      'Add a professional photo and cover image for best results',
      'Include all ways people can contact you (phone, email, WhatsApp)',
      'Preview your card before saving'
    ],
    faqs: [
      {
        question: 'What should I put in the username field?',
        answer: 'Choose something simple and memorable like "yourname" or "yourbusiness". This becomes your card URL: omniflow.app/card/yourname. Use only lowercase letters, numbers, and hyphens.'
      },
      {
        question: 'What action links should I add?',
        answer: 'Add links that help people take action - WhatsApp for instant chat, your website, booking calendar, menu, or payment link. Think about what you want visitors to do next.'
      },
      {
        question: 'How do I enable the contact form?',
        answer: 'Go to the "Lead Capture" tab and turn on Contact Form. When someone fills it, you\'ll get their details in your CRM automatically.'
      }
    ]
  },

  'smart-chat': {
    pageTitle: 'Smart Chat Helper',
    capabilities: [
      'Chat with our smart assistant for help',
      'Ask questions about using OmniFlow',
      'Get suggestions for growing your business'
    ],
    tips: [
      'Ask specific questions for better answers',
      'The assistant can help you write emails, texts, and posts'
    ]
  },

  'ai-chat': {
    pageTitle: 'AI Content Factory',
    overview: 'Let AI write content for you - social posts, emails, ads, blog articles, and more. Just describe what you want, and the AI creates it instantly.',
    capabilities: [
      'Generate social media posts for any platform',
      'Write professional email campaigns',
      'Create ad copy for Google, Facebook, LinkedIn',
      'Draft blog articles and web content',
      'Get trending topic suggestions'
    ],
    tips: [
      'Choose a specialized agent for best results (Content Writer for posts, Email Expert for campaigns)',
      'Be specific in your prompts - "Write a Facebook post about our new coffee blend" works better than "Write a post"',
      'You can edit the AI\'s output to match your brand voice',
      'Save good prompts to reuse later'
    ],
    faqs: [
      {
        question: 'How do I generate content with AI?',
        answer: 'Click on an AI agent (like Content Writer or Email Expert), then describe what you want. For example: "Write a friendly Instagram post announcing our weekend sale on shoes." The AI will draft it in seconds.'
      },
      {
        question: 'What should I write in prompts for best results?',
        answer: 'Be specific! Include: (1) What you\'re promoting, (2) Your target audience, (3) Desired tone (friendly/professional), (4) Call to action. Example: "Write a professional LinkedIn post for small business owners about time management, friendly tone, CTA to download our guide."'
      },
      {
        question: 'Can I edit what the AI creates?',
        answer: 'Absolutely! The AI creates a draft - you should always review and edit it to match your brand voice and add personal touches.'
      },
      {
        question: 'What are trending topics and how do I use them?',
        answer: 'Click the SEO Expert agent and ask for trending topics in your industry. The AI will suggest popular topics people are searching for, perfect for blog posts or social content.'
      }
    ]
  },

  'sms-marketing': {
    pageTitle: 'Text Messages',
    capabilities: [
      'View all text messages you\'ve sent',
      'Check delivery status of your messages',
      'See message history with each contact'
    ],
    quickActions: [
      {
        label: 'Send New Message',
        icon: Send,
        onClick: () => (window.location.href = '/sms-marketing/send')
      }
    ],
    tips: [
      'Keep text messages short - people read them quickly',
      'Include a clear action (like "Reply YES to confirm")',
      'Best times to send: 10 AM - 8 PM on weekdays'
    ]
  },

  'social-media': {
    pageTitle: 'Content Writer',
    capabilities: [
      'Let the computer write social media posts for you',
      'Create email messages automatically',
      'Generate blog articles and web page content'
    ],
    quickActions: [
      {
        label: 'Create Post',
        icon: PlusCircle,
        onClick: () => {
          const createButton = document.querySelector('[data-action="create-content"]') as HTMLElement;
          createButton?.click();
        }
      }
    ],
    tips: [
      'Just describe what you want to say, and the computer will write it for you',
      'You can edit the content after it\'s generated to make it perfect',
      'Save your favorite posts to reuse them later'
    ]
  },

  onboarding: {
    pageTitle: 'Getting Started Checklist',
    overview: 'Track your progress as you get started with OmniFlow. Complete these simple steps to unlock the full power of your marketing platform.',
    capabilities: [
      'Add your first contacts using the built-in CRM',
      'Send your first email campaign (no external service needed)',
      'Create a Digital Business Card for lead capture',
      'Try AI content generation',
      'Set up email automation',
      'Launch multi-channel campaigns'
    ],
    tips: [
      'You can complete all these steps using OmniFlow\'s built-in features - no external tools required!',
      'Start with "Add Contacts" - it\'s the easiest first step',
      'Each completed step unlocks new marketing capabilities',
      'Skip any step and come back later - there\'s no pressure'
    ],
    faqs: [
      {
        question: 'Do I need to set up external tools first?',
        answer: 'No! All checklist items use OmniFlow\'s built-in features. You can add contacts, send emails, create digital cards, and use AI without connecting any external services.'
      },
      {
        question: 'What happens when I complete all checklist items?',
        answer: 'You\'ll have a fully functional marketing system! You\'ll have sent campaigns, captured leads, used AI, and set up automation - all the basics for successful marketing.'
      }
    ]
  },

  'get-started': {
    pageTitle: 'Quick Start Guide',
    overview: 'Start marketing in 24 hours! This guide walks you through OmniFlow\'s built-in features step by step - no external tools required.',
    capabilities: [
      'Add your first contacts to the built-in CRM',
      'Send email campaigns using built-in email marketing',
      'Create a Digital Business Card for instant web presence',
      'Use AI to write marketing content',
      'Set up automated email sequences',
      'Launch campaigns across email, SMS, and WhatsApp'
    ],
    quickActions: [
      {
        label: 'View Checklist',
        icon: Lightbulb,
        onClick: () => (window.location.href = '/'),
      }
    ],
    tips: [
      'Everything you need is built into OmniFlow - CRM, email, SMS, WhatsApp, and AI',
      'External tools (Brevo, HubSpot, etc.) are optional for advanced users only',
      'Follow the checklist on your dashboard to track progress',
      'Most users can start sending campaigns in under 15 minutes',
      'Digital Business Cards are a unique OmniFlow feature - great for lead capture'
    ],
    faqs: [
      {
        question: 'Can I really start without connecting external tools?',
        answer: 'Yes! OmniFlow is a complete platform. Built-in CRM holds your contacts, built-in email marketing sends campaigns, built-in SMS works via wa.me links (free!), and AI generates content. External integrations are optional extras for advanced users.'
      },
      {
        question: 'How long does it take to get started?',
        answer: 'Most users send their first campaign within 15 minutes: (1) Add 10 contacts (5 min), (2) Use AI to write email (2 min), (3) Send campaign (3 min). The checklist guides you through each step.'
      },
      {
        question: 'What are the "built-in" features?',
        answer: 'OmniFlow includes: CRM (contact management), Email Marketing, SMS messaging, WhatsApp (via wa.me links), AI Content Generation, Digital Business Cards, and Marketing Automation. You don\'t need external services for any of these!'
      },
      {
        question: 'When should I use external integrations?',
        answer: 'Only if you: (1) Already use HubSpot/Zoho and want to sync contacts, (2) Need to send 1000+ emails/day (use Brevo for higher limits), or (3) Need WhatsApp Business API with template approvals. For most users, built-in features are enough.'
      }
    ]
  },

  'my-team': {
    pageTitle: 'My Team',
    capabilities: [
      'Invite team members to help manage your account',
      'Set permissions for what each person can do',
      'Remove team members when needed'
    ],
    tips: [
      'Give team members only the access they need',
      'You can always change permissions later'
    ]
  },

  settings: {
    pageTitle: 'Settings',
    overview: 'Connect your business tools, manage your subscription, and configure how OmniFlow works for you. This is your control center.',
    capabilities: [
      'Connect email services (Brevo, SMTP)',
      'Connect messaging platforms (WhatsApp, SMS)',
      'Manage your subscription and billing',
      'Add team members and manage permissions',
      'Update your business information'
    ],
    tips: [
      'Start with the Integrations tab to connect email and messaging services',
      'You\'ll need API keys or credentials from each service you connect',
      'Add team members in the Users tab to collaborate',
      'Keep your business info updated - it appears on invoices and emails'
    ],
    faqs: [
      {
        question: 'How do I connect my email service?',
        answer: 'Go to Settings → Integrations tab. For Brevo: paste your API key. For Gmail/SMTP: enter your email, password, and server details. Most providers show these in their Settings → API or SMTP section.'
      },
      {
        question: 'Where do I find API keys for different services?',
        answer: 'Brevo: Account → SMTP & API → API Keys. HubSpot: Settings → Integrations → Private Apps. WATI: Dashboard → API Docs. MSG91: Dashboard → Settings → API Keys. Each service is slightly different.'
      },
      {
        question: 'How do I add team members?',
        answer: 'Go to Settings → Users tab, click Invite User, enter their email. They\'ll receive an invitation to join your OmniFlow account.'
      },
      {
        question: 'Can I change my subscription plan?',
        answer: 'Yes! Go to Settings → Billing tab to upgrade or downgrade your plan. Changes take effect immediately, and billing adjusts automatically.'
      }
    ]
  }
};
