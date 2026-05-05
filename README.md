# Campaignflow CRM - Email Sender Module

An open-source, AI-native CRM foundation module for sending bulk, personalized emails directly through your own Gmail account. Built with a Node.js backend (SQLite) and a premium React/Vite frontend.

## Features
- **Gmail Integration:** Sends emails one-by-one from your own account to ensure high deliverability.
- **Dynamic Templates:** Upload a CSV and use `{{column_name}}` to inject dynamic data into your subject lines and email bodies.
- **Live Tracking:** Injects a 1x1 tracking pixel to monitor open rates.
- **Reply Detection:** Automatically polls Gmail threads to track exactly who replied.
- **Smart Pacing:** Configurable delays between each email to respect Gmail's sending limits and appear human.
- **Sleek Dashboard:** A premium, dark-mode focused UI with full transparency into every recipient's status.

## Quick Start

### 1. Installation
Clone the repository, then install the dependencies for both the server and client:

```bash
cd server
npm install
cd ../client
npm install
```

### 2. Build & Run
The application runs as a unified full-stack system on port 8001. First, build the frontend:

```bash
cd client
npm run build
```

Then, start the backend server (which will also serve the frontend UI):

```bash
cd ../server
npm run start
```

Open your browser to `http://localhost:8001`.

### 3. Setup Google OAuth
To send emails through Gmail, you need to provide your own Google Cloud OAuth credentials.

#### Step-by-Step Guide
1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Click **Select a project** -> **New Project**, and give it a name (e.g., "Campaignflow CRM").
3. In the search bar, search for **Gmail API** and click **Enable**.
4. Go to **APIs & Services** > **OAuth consent screen**.
   - Select **External** and click Create.
   - Fill in the required fields (App name, User support email, Developer contact).
   - Under "Test users", click **Add Users** and add the Gmail address you plan to send emails from.
   - Save and continue.
5. Go to **APIs & Services** > **Credentials**.
   - Click **Create Credentials** > **OAuth client ID**.
   - Application type: **Web application**.
   - Name: "CRM Sender".
   - Under **Authorized redirect URIs**, click "Add URI" and paste exactly:
     `http://localhost:8001/api/oauth/callback`
   - Click **Create**.
6. A modal will pop up displaying your **Client ID** and **Client Secret**. Keep this open.
7. Go to your local application running at `http://localhost:8001`, click on **Settings** in the sidebar.
8. Paste your Client ID and Client Secret into the form and click **Save**.
9. Go back to the Dashboard and click **Connect Gmail**!

---

*Note: Since this app uses the restricted `gmail.send` scope, Google will show a "Google hasn't verified this app" warning when you try to log in. Because you are the developer and you explicitly added your email as a Test User, you can click "Advanced" -> "Go to [App Name] (unsafe)" to proceed.*
