# Meta / Instagram OAuth Integration Guide

Complete reference for setting up Meta's Instagram OAuth flow with AutoDM.

---

## 1. Flow Diagram

```text
               YOUR WEBSITE (React)
                        │
                        │ 1. User clicks "Connect with Meta"
                        ▼
               FastAPI Backend (/api/v1/social/connect)
                        │
                        │ 2. Returns Instagram Authorization URL
                        ▼
                Instagram / Meta OAuth Dialog
                        │
                        │ 3. User logs in & grants permissions
                        ▼
               FastAPI Callback (/api/v1/social/callback)
                        │
                        │ 4. Exchanges code for 60-day long-lived token
                        │ 5. Fetches profile (@username) & recent media
                        ▼
                 Supabase Database
                        │ - Stores account in `social_accounts`
                        │ - Stores encrypted token in `social_account_tokens`
                        │ - Syncs posts into `posts` table
                        ▼
               Redirect to React Frontend (/dashboard?connected=true)
                        │
                        ▼
             🟢 Connected @mybusiness
             [ Create AutoDM ]
```

---

## 2. Meta App Dashboard Configuration

### Step A: Create a Meta Developer App
1. Go to [developers.facebook.com](https://developers.facebook.com/).
2. Click **My Apps** $\to$ **Create App**.
3. Select App Type: **Business** (or **Other** $\to$ **Business**).
4. Enter an App Name (e.g. `AutoDM`) and your contact email.

### Step B: Add Instagram Products
1. In your Meta App Dashboard sidebar, click **Add Product**.
2. Add:
   * **Instagram Graph API** (for business comments, media, and DMs)
   * **Facebook Login for Business** (for token authorization)

### Step C: Configure OAuth Redirect URIs (CRITICAL)

Because your app uses the **Instagram Business Login** flow (`client_id=1865064594103092`):

1. In your Meta App Dashboard left sidebar, navigate to:
   👉 **Instagram** $\to$ **API setup with Instagram login**.
2. Scroll down past *2. Configure webhooks* to:
   👉 **3. Set up Instagram business login**.
3. Click **Business login settings**.
4. In the **OAuth redirect URIs** box, paste your callback URL:
   * **Your Active Ngrok URL:**
     ```text
     https://recliner-filter-luxurious.ngrok-free.dev/api/v1/social/callback
     ```
     *(Also add `https://recliner-filter-luxurious.ngrok-free.dev/api/v1/social/callback/` with the trailing slash)*
5. Click **Save Changes** at the bottom of the section.

*(Note: If you only add the redirect URI under "Facebook Login", Instagram will reject it with `Invalid redirect_uri`. It must be saved in **Instagram Business login settings**).*

## 3. Environment Variables (`backend/.ENV`)

Your `backend/.ENV` is configured as:

```env
# Meta / Instagram OAuth Credentials
SOCIAL_CLIENT_ID=1865064594103092
SOCIAL_CLIENT_SECRET=05f54725fa65e877ed91022939be6892
SOCIAL_REDIRECT_URI=https://recliner-filter-luxurious.ngrok-free.dev/api/v1/social/callback

# Set to False to run live Meta OAuth flow
MOCK_SOCIAL_API=false
```

---

## 4. Endpoints & Technical Details

### Endpoint 1: Initiate OAuth Connection
* **Frontend Request:**
  `POST https://recliner-filter-luxurious.ngrok-free.dev/api/v1/social/connect`
  ```json
  { "platform": "instagram" }
  ```
* **FastAPI Response:**
  ```json
  {
    "success": true,
    "data": {
      "authorization_url": "https://www.instagram.com/oauth/authorize?enable_fb_login=0&force_authentication=1&client_id={SOCIAL_CLIENT_ID}&redirect_uri=https://recliner-filter-luxurious.ngrok-free.dev/api/v1/social/callback&response_type=code&scope=instagram_business_basic,instagram_business_manage_messages,instagram_business_manage_comments&state=user_{user_id}",
      "mock": false
    }
  }
  ```
* **Frontend Action:**
  The frontend redirects the user's browser:
  `window.location.href = data.authorization_url;`

---

### Endpoint 2: Instagram OAuth Authorization Dialog
* **Meta URL:** `https://www.instagram.com/oauth/authorize`
* **Query Parameters:**
  | Parameter | Description | Value |
  | :--- | :--- | :--- |
  | `client_id` | Your Meta App ID | `1865064594103092` |
  | `redirect_uri` | Callback URL registered in Meta | `https://recliner-filter-luxurious.ngrok-free.dev/api/v1/social/callback` |
  | `response_type` | Always `code` | `code` |
  | `scope` | Required permissions | `instagram_business_basic,instagram_business_manage_messages,instagram_business_manage_comments` |
  | `state` | Current user ID to prevent CSRF | `user_b94d27b9-934d-4bc...` |

---

### Endpoint 3: FastAPI Callback Handler
* **URL:** `GET https://recliner-filter-luxurious.ngrok-free.dev/api/v1/social/callback?code={CODE}&state={STATE}`
* **FastAPI Actions:**
  1. **Exchange Code for Short-Lived Access Token:**
     * `POST https://api.instagram.com/oauth/access_token`
     * Parameters: `client_id`, `client_secret`, `grant_type=authorization_code`, `redirect_uri`, `code`
  2. **Exchange for 60-Day Long-Lived Token:**
     * `GET https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret={SECRET}&access_token={SHORT_TOKEN}`
  3. **Fetch Instagram Account Profile:**
     * `GET https://graph.instagram.com/v21.0/me?fields=id,username,account_type&access_token={LONG_TOKEN}`
  4. **Save in Supabase:**
     * Upsert to `social_accounts` (`username`, `external_account_id`, `status: "connected"`)
     * Upsert to `social_account_tokens` (`access_token_enc`)
  5. **Sync Recent Posts:**
     * `GET https://graph.instagram.com/v21.0/me/media?fields=id,caption,media_type,permalink&access_token={LONG_TOKEN}`
     * Upserts posts into `posts` table so they appear in AutoDM Post Selector.
  6. **Redirect to Frontend:**
     * Browser is redirected back to:
       `http://localhost:5173/dashboard?connected=true&username={username}`

---

### Endpoint 4: React Dashboard Presentation
When the user arrives back at `http://localhost:5173/dashboard?connected=true`:
* React queries `GET /api/v1/dashboard/summary`
* The top card updates from:
  ```text
  Instagram Account
  ❌ Not connected
  [ Connect Instagram ]
  ```
  to:
  ```text
  Instagram Account
  🟢 Connected @mybusiness
  [ Create AutoDM ]
  ```
* The user clicks **[ Create AutoDM ]** to select from their synced posts (e.g. `Product Launch`, `New Shoes`, `Summer Offer`) and configure trigger keywords (`PRICE`).
