import type { Template } from '@/types/templates';

const baseDate = new Date('2025-10-27').toISOString();

export const defaultTemplates: Template[] = [
  {
    id: 'welcome-general-001',
    type: 'email',
    industry: ['general'],
    category: 'welcome',
    name: 'Welcome Email for New Customers',
    description: 'Friendly introduction for first-time customers',
    subject: 'Welcome to {business}! 🎉',
    content: `Hi {name},

Welcome to {business}! We're thrilled to have you with us.

We're here to help you get the most out of our services. If you have any questions, just reply to this email.

Looking forward to serving you!

Best regards,
{business} Team`,
    variables: ['name', 'business'],
    popularity: 0,
    createdBy: 'omniflow',
    createdAt: baseDate,
  },
  {
    id: 'promo-general-001',
    type: 'email',
    industry: ['general', 'ecommerce', 'restaurant'],
    category: 'promotional',
    name: 'Special Offer Announcement',
    description: 'Announce limited-time discount or promotion',
    subject: 'Special Offer Just for You! {discount}% Off',
    content: `Hi {name},

For a limited time, enjoy {discount}% off on {product}!

This exclusive offer is our way of saying thank you for being a valued customer.

Use code: {code} at checkout

Offer expires in {days} days.

Shop now at {business}!

Cheers,
{business} Team`,
    variables: ['name', 'business', 'discount', 'product', 'code', 'days'],
    popularity: 0,
    createdBy: 'omniflow',
    createdAt: baseDate,
  },
  {
    id: 'cart-ecommerce-001',
    type: 'email',
    industry: ['ecommerce'],
    category: 'abandoned_cart',
    name: 'Abandoned Cart Reminder',
    description: 'Remind customers about items left in cart',
    subject: 'You Left Something Behind! 🛒',
    content: `Hi {name},

We noticed you left {product} in your cart at {business}.

Still interested? Complete your purchase now and we'll throw in free shipping!

Click here to finish checkout: {link}

Hurry, items in your cart are selling fast!

Happy shopping,
{business} Team`,
    variables: ['name', 'business', 'product', 'link'],
    popularity: 0,
    createdBy: 'omniflow',
    createdAt: baseDate,
  },
  {
    id: 'reminder-salon-001',
    type: 'sms',
    industry: ['salon', 'service'],
    category: 'reminder',
    name: 'Appointment Reminder SMS',
    description: 'Reminder for upcoming appointment',
    content: 'Hi {name}, this is a reminder about your appointment at {business} tomorrow at {time}. See you then!',
    variables: ['name', 'business', 'time'],
    popularity: 0,
    createdBy: 'omniflow',
    createdAt: baseDate,
  },
  {
    id: 'listing-realestate-001',
    type: 'email',
    industry: ['realestate'],
    category: 'promotional',
    name: 'New Property Alert',
    description: 'Notify clients about new property listings',
    subject: 'New Property Alert: {property} in {location}',
    content: `Hi {name},

Great news! A new property matching your criteria is now available.

📍 Location: {location}
🏠 Property: {property}
💰 Price: {price}
🛏️ Bedrooms: {bedrooms}

This is a fantastic opportunity in a prime location. Properties in this area move fast!

Schedule a viewing today: {link}

Best regards,
{business}`,
    variables: ['name', 'business', 'property', 'location', 'price', 'bedrooms', 'link'],
    popularity: 0,
    createdBy: 'omniflow',
    createdAt: baseDate,
  },
  {
    id: 'followup-general-001',
    type: 'email',
    industry: ['general', 'service', 'coaching'],
    category: 'followup',
    name: 'Thank You & Follow-Up',
    description: 'Follow up after a meeting or purchase',
    subject: 'Thank You, {name}!',
    content: `Hi {name},

Thank you for choosing {business}! We hope you're enjoying {product}.

We'd love to hear your feedback. How was your experience?

If you have any questions or need assistance, we're just an email away.

Best regards,
{business} Team`,
    variables: ['name', 'business', 'product'],
    popularity: 0,
    createdBy: 'omniflow',
    createdAt: baseDate,
  },
  {
    id: 'restaurant-special-001',
    type: 'email',
    industry: ['restaurant'],
    category: 'special_offer',
    name: 'Restaurant Special Menu',
    description: 'Promote special menu or limited-time dish',
    subject: 'New {dish} on Our Menu! 🍽️',
    content: `Hi {name},

We're excited to introduce our new {dish} at {business}!

Available for a limited time only. Book your table now and be among the first to try it.

Special offer: {discount}% off for reservations this week!

Reserve now: {link}

See you soon!
{business}`,
    variables: ['name', 'business', 'dish', 'discount', 'link'],
    popularity: 0,
    createdBy: 'omniflow',
    createdAt: baseDate,
  },
  {
    id: 'coaching-welcome-001',
    type: 'email',
    industry: ['coaching'],
    category: 'welcome',
    name: 'Coaching Program Welcome',
    description: 'Welcome new coaching clients',
    subject: 'Welcome to Your Transformation Journey! 🎯',
    content: `Hi {name},

Welcome to {program} at {business}!

I'm excited to start this journey with you. Together, we'll work towards {goal}.

Your first session is scheduled for {date} at {time}.

In the meantime, please complete the intake form: {link}

Looking forward to working with you!

Best,
{coach}`,
    variables: ['name', 'business', 'program', 'goal', 'date', 'time', 'link', 'coach'],
    popularity: 0,
    createdBy: 'omniflow',
    createdAt: baseDate,
  },
  {
    id: 'ecommerce-order-001',
    type: 'email',
    industry: ['ecommerce'],
    category: 'followup',
    name: 'Order Confirmation',
    description: 'Confirm order and provide shipping details',
    subject: 'Your Order #{orderId} is Confirmed! 📦',
    content: `Hi {name},

Thank you for your order at {business}!

Order Number: #{orderId}
Product: {product}
Total: {total}

Your order will be shipped within {days} business days. You'll receive a tracking number once it ships.

Questions? Contact us anytime.

Thanks for shopping with us!
{business}`,
    variables: ['name', 'business', 'orderId', 'product', 'total', 'days'],
    popularity: 0,
    createdBy: 'omniflow',
    createdAt: baseDate,
  },
  {
    id: 'salon-birthday-001',
    type: 'sms',
    industry: ['salon', 'restaurant'],
    category: 'special_offer',
    name: 'Birthday Special SMS',
    description: 'Send birthday wishes with special offer',
    content: 'Happy Birthday {name}! 🎉 Celebrate with us at {business}. Enjoy {discount}% off this month. Book now: {link}',
    variables: ['name', 'business', 'discount', 'link'],
    popularity: 0,
    createdBy: 'omniflow',
    createdAt: baseDate,
  },
  {
    id: 'service-quote-001',
    type: 'email',
    industry: ['service'],
    category: 'followup',
    name: 'Service Quote Follow-Up',
    description: 'Follow up on a service quote',
    subject: 'Your Quote from {business}',
    content: `Hi {name},

Thank you for your interest in our {service} service.

Based on your requirements, here's your personalized quote:

Service: {service}
Estimated Cost: {price}
Timeline: {timeline}

This quote is valid for {days} days. Ready to get started? Reply to this email or call us at {phone}.

We look forward to working with you!

Best regards,
{business}`,
    variables: ['name', 'business', 'service', 'price', 'timeline', 'days', 'phone'],
    popularity: 0,
    createdBy: 'omniflow',
    createdAt: baseDate,
  },
  {
    id: 'realestate-viewing-001',
    type: 'sms',
    industry: ['realestate'],
    category: 'reminder',
    name: 'Property Viewing Reminder',
    description: 'Remind clients about property viewing',
    content: 'Hi {name}, reminder: Property viewing at {address} tomorrow at {time}. See you there! - {business}',
    variables: ['name', 'business', 'address', 'time'],
    popularity: 0,
    createdBy: 'omniflow',
    createdAt: baseDate,
  },
  {
    id: 'general-feedback-001',
    type: 'email',
    industry: ['general', 'service', 'restaurant', 'salon'],
    category: 'followup',
    name: 'Request Customer Feedback',
    description: 'Ask for reviews and feedback',
    subject: 'How Did We Do? Share Your Feedback',
    content: `Hi {name},

We hope you enjoyed your recent experience with {business}!

Your feedback helps us improve and serve you better. Would you take a moment to share your thoughts?

Leave a review here: {link}

As a thank you, we'll send you a {discount}% discount code for your next visit!

Thank you for being a valued customer.

Best regards,
{business}`,
    variables: ['name', 'business', 'link', 'discount'],
    popularity: 0,
    createdBy: 'omniflow',
    createdAt: baseDate,
  },
  {
    id: 'coaching-checkin-001',
    type: 'sms',
    industry: ['coaching'],
    category: 'followup',
    name: 'Coaching Check-In SMS',
    description: 'Check in with coaching clients',
    content: 'Hi {name}! How are you progressing with {goal}? Let me know if you need support. - {coach} at {business}',
    variables: ['name', 'business', 'goal', 'coach'],
    popularity: 0,
    createdBy: 'omniflow',
    createdAt: baseDate,
  },
  {
    id: 'ecommerce-restock-001',
    type: 'email',
    industry: ['ecommerce'],
    category: 'promotional',
    name: 'Product Back in Stock',
    description: 'Notify customers when product is restocked',
    subject: 'Good News! {product} is Back in Stock! 🎉',
    content: `Hi {name},

Great news! The {product} you were waiting for is back in stock at {business}!

These items sell out fast, so don't wait. Order yours today!

Shop now: {link}

Limited quantities available!

Happy shopping,
{business}`,
    variables: ['name', 'business', 'product', 'link'],
    popularity: 0,
    createdBy: 'omniflow',
    createdAt: baseDate,
  },
  {
    id: 'restaurant-reservation-001',
    type: 'sms',
    industry: ['restaurant'],
    category: 'reminder',
    name: 'Restaurant Reservation Reminder',
    description: 'Remind customers about their reservation',
    content: 'Hi {name}, your table for {guests} is reserved at {business} on {date} at {time}. See you soon! Reply CANCEL to cancel.',
    variables: ['name', 'business', 'guests', 'date', 'time'],
    popularity: 0,
    createdBy: 'omniflow',
    createdAt: baseDate,
  },
  {
    id: 'salon-reminder-001',
    type: 'email',
    industry: ['salon'],
    category: 'reminder',
    name: 'Appointment Reminder Email',
    description: 'Email reminder for salon appointments',
    subject: 'Appointment Reminder - {service} Tomorrow',
    content: `Hi {name},

This is a friendly reminder about your upcoming appointment at {business}.

Service: {service}
Date: {date}
Time: {time}
Stylist: {stylist}

Please arrive 5 minutes early. If you need to reschedule, please call us at {phone}.

Looking forward to seeing you!

{business}`,
    variables: ['name', 'business', 'service', 'date', 'time', 'stylist', 'phone'],
    popularity: 0,
    createdBy: 'omniflow',
    createdAt: baseDate,
  },
  {
    id: 'service-estimate-001',
    type: 'sms',
    industry: ['service'],
    category: 'followup',
    name: 'Service Estimate SMS',
    description: 'Send quick service estimate via SMS',
    content: 'Hi {name}, estimate for {service}: {price}. Valid for {days} days. Ready to schedule? Call us at {phone} - {business}',
    variables: ['name', 'business', 'service', 'price', 'days', 'phone'],
    popularity: 0,
    createdBy: 'omniflow',
    createdAt: baseDate,
  },
  {
    id: 'general-welcome-sms-001',
    type: 'sms',
    industry: ['general'],
    category: 'welcome',
    name: 'Welcome SMS for New Customers',
    description: 'Short welcome message via SMS',
    content: 'Welcome to {business}, {name}! We\'re excited to serve you. Questions? Reply to this message or visit {link}',
    variables: ['name', 'business', 'link'],
    popularity: 0,
    createdBy: 'omniflow',
    createdAt: baseDate,
  },
  {
    id: 'realestate-offer-001',
    type: 'email',
    industry: ['realestate'],
    category: 'followup',
    name: 'Offer Submitted Confirmation',
    description: 'Confirm offer submission for property',
    subject: 'Your Offer on {property} Has Been Submitted',
    content: `Hi {name},

Good news! We've successfully submitted your offer on {property} at {location}.

Offer Details:
Property: {property}
Offer Amount: {price}
Submitted: {date}

The seller typically responds within {days} business days. We'll keep you updated on any developments.

In the meantime, if you have questions, don't hesitate to reach out.

Best regards,
{agent} at {business}`,
    variables: ['name', 'business', 'property', 'location', 'price', 'date', 'days', 'agent'],
    popularity: 0,
    createdBy: 'omniflow',
    createdAt: baseDate,
  },
  {
    id: 'coaching-session-001',
    type: 'email',
    industry: ['coaching'],
    category: 'reminder',
    name: 'Coaching Session Reminder',
    description: 'Remind clients about upcoming coaching session',
    subject: 'Coaching Session Tomorrow - {topic}',
    content: `Hi {name},

Looking forward to our session tomorrow!

Session Details:
Topic: {topic}
Date: {date}
Time: {time}
Duration: {duration}
Meeting Link: {link}

Please review your action items from last session and come prepared with any questions.

See you tomorrow!

{coach}
{business}`,
    variables: ['name', 'business', 'topic', 'date', 'time', 'duration', 'link', 'coach'],
    popularity: 0,
    createdBy: 'omniflow',
    createdAt: baseDate,
  },
  {
    id: 'ecommerce-shipping-001',
    type: 'email',
    industry: ['ecommerce'],
    category: 'followup',
    name: 'Order Shipped Notification',
    description: 'Notify customer that order has shipped',
    subject: 'Your Order is On Its Way! 🚚',
    content: `Hi {name},

Great news! Your order from {business} has shipped!

Order Number: #{orderId}
Tracking Number: {trackingNumber}
Estimated Delivery: {deliveryDate}

Track your package: {trackingLink}

Thank you for shopping with us. We hope you love your {product}!

{business}`,
    variables: ['name', 'business', 'orderId', 'trackingNumber', 'deliveryDate', 'trackingLink', 'product'],
    popularity: 0,
    createdBy: 'omniflow',
    createdAt: baseDate,
  },
  {
    id: 'restaurant-loyalty-001',
    type: 'email',
    industry: ['restaurant'],
    category: 'special_offer',
    name: 'Loyalty Reward Email',
    description: 'Notify customers about loyalty rewards',
    subject: 'You\'ve Earned a Reward at {business}! 🎁',
    content: `Hi {name},

Congratulations! You've earned {points} loyalty points at {business}.

Your reward is ready: {reward}!

Redeem your reward on your next visit. Just show this email to your server.

Valid until: {expiryDate}

Thank you for being a loyal customer!

{business}`,
    variables: ['name', 'business', 'points', 'reward', 'expiryDate'],
    popularity: 0,
    createdBy: 'omniflow',
    createdAt: baseDate,
  },
  {
    id: 'service-complete-001',
    type: 'sms',
    industry: ['service', 'salon'],
    category: 'followup',
    name: 'Service Completed Follow-Up',
    description: 'Thank customer after service completion',
    content: 'Thank you for choosing {business}, {name}! How was your {service}? Reply with feedback or rate us here: {link}',
    variables: ['name', 'business', 'service', 'link'],
    popularity: 0,
    createdBy: 'omniflow',
    createdAt: baseDate,
  },
];
