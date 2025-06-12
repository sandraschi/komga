# Microsoft Teams Integration Guide

This guide explains how to register your app with Microsoft Azure for Teams and Microsoft Graph API integration, obtain credentials, set permissions, and configure your backend.

## 1. Register Your App in Azure

1. Go to the [Azure Portal](https://portal.azure.com/).
2. Navigate to **Azure Active Directory > App registrations**.
3. Click **New registration**.
   - **Name:** e.g., `DocsViewer Teams Integration`
   - **Supported account types:** Choose as needed (usually "Accounts in this organizational directory only" for internal use).
   - **Redirect URI:** Set to `http://localhost:3000/api/teams/callback` (for local dev; adjust for production).
4. Click **Register**.

## 2. Get Your Credentials

- After registration, copy the following:
  - **Application (client) ID**
  - **Directory (tenant) ID**
- Go to **Certificates & secrets** > **New client secret**. Copy the secret immediately (it will not be shown again).

## 3. Set API Permissions

1. Go to **API permissions** > **Add a permission** > **Microsoft Graph** > **Delegated permissions**.
2. Add:
   - `User.Read`
   - `Chat.ReadWrite`
   - `Chat.ReadWrite.All`
   - `User.ReadBasic.All`
   - `offline_access`
3. Click **Grant admin consent** if required.

## 4. Configure Your Backend

Set the following environment variables (in your `.env` or system):

```
TEAMS_CLIENT_ID=your-application-client-id
TEAMS_CLIENT_SECRET=your-client-secret
TEAMS_REDIRECT_URI=http://localhost:3000/api/teams/callback
```

Restart your backend after setting these.

## 5. (Optional) PowerShell Script for App Registration

This script uses Azure CLI to automate app registration. You must be logged in as an admin.

```powershell
# Login to Azure
az login

# Variables
$appName = "DocsViewer Teams Integration"
$redirectUri = "http://localhost:3000/api/teams/callback"

# Create the app registration
$app = az ad app create --display-name "$appName" --reply-urls $redirectUri --available-to-other-tenants false | ConvertFrom-Json

# Create a client secret
$secret = az ad app credential reset --id $app.appId --append --display-name "DocsViewerSecret" | ConvertFrom-Json

# Assign permissions
az ad app permission add --id $app.appId --api 00000003-0000-0000-c000-000000000000 --api-permissions User.Read,Chat.ReadWrite,Chat.ReadWrite.All,User.ReadBasic.All,offline_access=Delegated

# Grant admin consent
az ad app permission grant --id $app.appId --api 00000003-0000-0000-c000-000000000000
az ad app permission admin-consent --id $app.appId

Write-Host "App ID: $($app.appId)"
Write-Host "Client Secret: $($secret.password)"
Write-Host "Redirect URI: $redirectUri"
```

**Note:**
- You may need to install the Azure CLI: https://docs.microsoft.com/en-us/cli/azure/install-azure-cli
- Some permissions or consent steps may require admin rights.

## 6. Troubleshooting

- If you get authentication errors, check that your redirect URI matches exactly.
- Make sure all required permissions are granted and admin consent is given.
- Client secrets expire! Rotate and update them as needed.
- For production, use secure storage for secrets (not plain text).

## 7. Security Notes

- Never commit secrets to version control.
- Use environment variables or a secure vault for credentials.
- Limit permissions to only what is needed.

---

For more details, see the [Microsoft Graph documentation](https://docs.microsoft.com/en-us/graph/auth-register-app-v2). 