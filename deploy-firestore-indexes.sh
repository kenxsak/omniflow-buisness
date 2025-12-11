#!/bin/bash

# Firestore Indexes Deployment Script for Replit
# This script deploys your Firestore indexes without needing interactive login

echo "🚀 Deploying Firestore Indexes..."
echo ""

# Check if Firebase CLI is installed
if ! command -v firebase &> /dev/null; then
    echo "❌ Firebase CLI not found. Installing..."
    npm install -g firebase-tools
fi

# Method 1: Use cached credentials (if you've logged in before)
echo "Attempting to deploy with cached credentials..."
firebase deploy --only firestore:indexes

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Success! Your indexes are deploying."
    echo "📌 Check Firebase Console → Firestore → Indexes in 5-15 minutes"
else
    echo ""
    echo "⚠️  Authentication required. Follow these steps:"
    echo ""
    echo "1. Go to https://console.firebase.google.com"
    echo "2. Select your project"
    echo "3. Go to: Project Settings → Service Accounts"
    echo "4. Click 'Generate New Private Key'"
    echo "5. Save the JSON file as: firebase-key.json (in your project root)"
    echo "6. Run this command:"
    echo "   export GOOGLE_APPLICATION_CREDENTIALS=$(pwd)/firebase-key.json"
    echo "   firebase deploy --only firestore:indexes"
    echo ""
fi
