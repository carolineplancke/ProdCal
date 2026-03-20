# Power Automate Email Import Setup Guide

## Overview
This guide will help you set up a Power Automate flow that automatically imports calendar events when you forward Outlook invites to a specific email folder.

---

## 📧 Setup Process

### Step 1: Create an Email Folder in Outlook
1. Open Outlook (web or desktop)
2. Create a new folder called **"Calendar Imports"** in your mailbox
3. This is where you'll forward calendar invites for import

---

## 🔄 Power Automate Flow Configuration

### Step 2: Create a New Flow

1. Go to **https://make.powerautomate.com**
2. Click **"+ Create"** → **"Automated cloud flow"**
3. Name it: **"Import Calendar Events from Email"**
4. Choose trigger: **"When a new email arrives (V3)"**

---

### Step 3: Configure the Email Trigger

**Trigger: "When a new email arrives (V3)"**

Settings:
- **Folder**: Select "Calendar Imports" (the folder you created)
- **Include Attachments**: Yes
- **Only with Attachments**: No (calendar invites might be in body)

---

### Step 4: Parse Calendar Invite (.ics file)

Calendar invites often come as `.ics` attachments. Add these actions:

#### Action 1: **Condition - Check for .ics Attachment**

```
Condition: @{contains(triggerOutputs()?['body/hasAttachment'], true)}
```

#### Action 2: **Parse .ics Attachment** (if true branch)

Power Automate doesn't have a built-in ICS parser, so you have two options:

##### Option A: Use "Parse JSON" with manual extraction

Add **"Compose"** action to get attachment content:
```
Expression: @{first(triggerOutputs()?['body/attachments'])?['contentBytes']}
```

Then convert from base64:
```
Expression: @{base64ToString(outputs('Compose'))}
```

##### Option B: Use "Get event (V4)" if it's a meeting invite

If the email is a meeting request (not just forwarded), use:
- Action: **"Get event (V4)"** from Office 365 Outlook
- Event Id: `@{triggerOutputs()?['body/id']}`

---

### Step 5: Extract Event Details

Use **"Parse JSON"** or **"Compose"** actions to extract:

#### Required Fields:
- **id**: Unique identifier (use Email ID or generate GUID)
  ```
  Expression: @{guid()}
  ```
  
- **subject**: Event title
  ```
  Expression: @{triggerOutputs()?['body/subject']}
  ```
  
- **start**: Start datetime in UTC
  ```
  Expression: @{formatDateTime(triggerOutputs()?['body/start'], 'yyyy-MM-ddTHH:mm:ss')}Z
  ```
  
- **end**: End datetime in UTC
  ```
  Expression: @{formatDateTime(triggerOutputs()?['body/end'], 'yyyy-MM-ddTHH:mm:ss')}Z
  ```

#### Optional Fields:
- **location**: Event location
- **description**: Event description  
- **attendees**: Array of attendee emails
- **organizer**: Organizer email
- **category**: Event category (Product, Health, Insurance, Engineering, Marketing, Sales, General)
- **emailSubject**: Original email subject
- **emailFrom**: Sender email address

---

### Step 6: Call Your Backend API

Add action: **"HTTP"**

**Configuration:**

- **Method**: POST
- **URI**: 
  ```
  https://[YOUR_PROJECT_ID].supabase.co/functions/v1/make-server-832943b5/events/import-from-email
  ```
  
- **Headers**:
  ```json
  {
    "Content-Type": "application/json",
    "Authorization": "Bearer [YOUR_SUPABASE_ANON_KEY]",
    "X-API-Key": "[YOUR_API_KEY]"
  }
  ```

- **Body** (JSON):
  ```json
  {
    "id": "@{guid()}",
    "subject": "@{triggerOutputs()?['body/subject']}",
    "start": "@{formatDateTime(outputs('Start_DateTime'), 'yyyy-MM-ddTHH:mm:ss')}Z",
    "end": "@{formatDateTime(outputs('End_DateTime'), 'yyyy-MM-ddTHH:mm:ss')}Z",
    "location": "@{coalesce(outputs('Location'), '')}",
    "description": "@{coalesce(triggerOutputs()?['body/bodyPreview'], '')}",
    "organizer": "@{triggerOutputs()?['body/from']}",
    "attendees": [],
    "isRecurring": false,
    "isCancelled": false,
    "category": "General",
    "emailSubject": "@{triggerOutputs()?['body/subject']}",
    "emailFrom": "@{triggerOutputs()?['body/from']}"
  }
  ```

---

### Step 7: Add Error Handling (Optional)

Add **"Configure run after"** on a notification action:
- Condition: **has failed**
- Action: Send yourself an email notification

---

## 📝 Complete Flow Example (Visual Summary)

```
1. Trigger: When a new email arrives (V3)
   └─ Folder: Calendar Imports
   └─ Include Attachments: Yes
   
2. Condition: Has .ics attachment?
   ├─ YES Branch:
   │  └─ Parse .ics file
   │  └─ Extract event details
   │  └─ HTTP POST to backend
   │
   └─ NO Branch:
      └─ Check if meeting request
      └─ Get event details from Outlook
      └─ HTTP POST to backend

3. Send success notification (optional)
```

---

## 🔍 Alternative: Parse .ics File Manually

If you need to parse `.ics` files from attachments, here's the structure:

### Sample .ics Content:
```
BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
UID:unique-id-123
DTSTART:20260210T140000Z
DTEND:20260210T150000Z
SUMMARY:Team Meeting
LOCATION:Conference Room A
DESCRIPTION:Quarterly review meeting
ORGANIZER:mailto:organizer@example.com
ATTENDEE:mailto:attendee1@example.com
END:VEVENT
END:VCALENDAR
```

### Power Automate Parsing:
Use **"Compose"** actions with expressions:

**Extract Subject:**
```
@{split(split(outputs('ICS_Content'), 'SUMMARY:')[1], '\n')[0]}
```

**Extract Start Time:**
```
@{split(split(outputs('ICS_Content'), 'DTSTART:')[1], '\n')[0]}
```

**Extract End Time:**
```
@{split(split(outputs('ICS_Content'), 'DTEND:')[1], '\n')[0]}
```

**Extract Location:**
```
@{split(split(outputs('ICS_Content'), 'LOCATION:')[1], '\n')[0]}
```

---

## 🎯 Usage Instructions for End Users

Once your flow is set up:

1. **Receive a calendar invite** in Outlook
2. **Forward the email** to your "Calendar Imports" folder
   - Or **Move** the email to that folder
3. Power Automate **automatically detects** the new email
4. The flow **parses** the calendar invite
5. Event is **imported** to your calendar app
6. View the event in your calendar with **category filtering**

---

## 🛠️ Troubleshooting

### Issue: Events not importing
- ✅ Check that email is in "Calendar Imports" folder
- ✅ Verify API key is correct in HTTP request
- ✅ Check Power Automate run history for errors
- ✅ Ensure datetime is in proper UTC format (ends with Z)

### Issue: Missing event details
- ✅ Check if .ics attachment exists
- ✅ Verify email contains calendar event data
- ✅ Review flow run history to see parsed values

### Issue: Duplicate events
- ✅ Each event needs a unique `id`
- ✅ Use consistent ID generation (email ID or event UID)
- ✅ Backend will overwrite if same ID is used

---

## 🔐 Security Best Practices

1. **Never share your API key publicly**
2. **Store API key in Power Automate environment variables**
3. **Use service accounts** for production flows
4. **Restrict folder access** to authorized users only
5. **Enable flow run history retention** for auditing

---

## 📊 Monitoring

Track imported events:
- Check Power Automate **run history**
- View backend logs in Supabase Functions
- Monitor events in your calendar app's **Admin Panel**
- Filter by `importSource: "email"` to see email imports

---

## 🚀 Advanced: Auto-Categorization

Add intelligent category assignment based on email content:

```json
{
  "category": "@{
    if(
      or(
        contains(triggerOutputs()?['body/subject'], 'Product'),
        contains(triggerOutputs()?['body/subject'], 'Launch')
      ),
      'Product',
      if(
        or(
          contains(triggerOutputs()?['body/subject'], 'Engineering'),
          contains(triggerOutputs()?['body/subject'], 'Dev')
        ),
        'Engineering',
        if(
          contains(triggerOutputs()?['body/subject'], 'Marketing'),
          'Marketing',
          'General'
        )
      )
    )
  }"
}
```

---

## 📞 Need Help?

- Check backend logs: Supabase → Functions → Logs
- Review Power Automate run history
- Test with the health endpoint: `GET /make-server-832943b5/health`
- Verify API key status: `GET /make-server-832943b5/config/api-key`

---

## ✅ Quick Start Checklist

- [ ] Create "Calendar Imports" folder in Outlook
- [ ] Set up Power Automate flow with email trigger
- [ ] Configure .ics parsing or meeting request detection
- [ ] Add HTTP POST action with correct endpoint
- [ ] Include API key and authorization headers
- [ ] Test by forwarding a calendar invite
- [ ] Verify event appears in calendar app
- [ ] Add error handling and notifications

---

**Endpoint:** `POST /make-server-832943b5/events/import-from-email`

**Headers:**
- `Authorization: Bearer [SUPABASE_ANON_KEY]`
- `X-API-Key: [YOUR_API_KEY]`
- `Content-Type: application/json`

**Required Fields:** id, subject, start, end

**Your backend is ready to receive forwarded calendar invites! 🎉**
