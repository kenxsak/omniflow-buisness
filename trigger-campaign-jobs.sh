#!/bin/bash
# Manual script to trigger campaign job processor
# This simulates the Vercel cron job

SECRET="a1b2c3d4-super-secret-key-5e6f7g8h-9i0j"

echo "🚀 Triggering campaign job processor..."
echo "This will process any pending email/SMS/WhatsApp campaigns"
echo ""

curl -X GET "http://localhost:5000/api/run-campaign-jobs" \
  -H "Authorization: Bearer $SECRET" \
  -H "Content-Type: application/json" \
  -w "\n\nHTTP Status: %{http_code}\n" \
  2>/dev/null | jq '.' 2>/dev/null || cat

echo ""
echo "✅ Done! Check the Campaign Jobs page to see the results"
echo "   Navigate to: /campaign-jobs"
