# Free External Cron Services Setup Guide

## Option 1: cron-job.org (Free)
1. Go to https://cron-job.org
2. Create free account (allows 3 cron jobs)
3. Create new job:
   - URL: `https://sibaigcaglcmhfhvrwol.supabase.co/functions/v1/task-automation`
   - Schedule: `0 6 * * *` (daily at 6 AM)
   - Method: POST
   - Headers: 
     ```
     Content-Type: application/json
     Authorization: Bearer YOUR_ANON_KEY
     ```
   - Body: `{"automated": true}`

## Option 2: Uptime Robot (Free)
1. Go to https://uptimerobot.com
2. Create free account (allows 50 monitors)
3. Create HTTP(s) monitor:
   - URL: `https://sibaigcaglcmhfhvrwol.supabase.co/functions/v1/task-automation`
   - Check every: 30 minutes
   - Add custom HTTP headers if needed

## Option 3: Cron Jobs Free (Free)
1. Go to https://cron-jobs.org
2. Create account
3. Set up daily job to hit your endpoint

## Option 4: GitHub Actions (Free)
Create `.github/workflows/task-automation.yml`:

```yaml
name: Daily Task Automation

on:
  schedule:
    - cron: '0 6 * * *'  # Daily at 6 AM UTC
  workflow_dispatch:  # Allow manual trigger

jobs:
  trigger-automation:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger Task Automation
        run: |
          curl -X POST \
            -H "Content-Type: application/json" \
            -H "Authorization: Bearer ${{ secrets.SUPABASE_ANON_KEY }}" \
            -d '{"automated": true}' \
            https://sibaigcaglcmhfhvrwol.supabase.co/functions/v1/task-automation
```

Add your anon key as a GitHub secret: SUPABASE_ANON_KEY

## Recommendation
For FREE tier: Use **Option 1 (cron-job.org)** + **Frontend automation hook**
This gives you:
- Scheduled automation when no one is using the app
- Immediate automation when users are active
- No dependency on Supabase Pro features
