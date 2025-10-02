# Firebase Email Templates Setup Guide

Beautiful, branded email templates for the PLV CEIT Digital Classroom Assignment System.

## Features

✅ Modern, professional design matching your app's branding
✅ Blue gradient header with PLV logo
✅ Responsive design that works on all devices
✅ Clear call-to-action buttons
✅ Security warnings and notices
✅ PLV CEIT footer with school information

## How to Apply These Templates

### Step 1: Open Firebase Console

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: **plv-ceit-classroom**
3. Navigate to **Authentication** → **Templates**

### Step 2: Update Email Verification Template

1. Click on **Email address verification**
2. Scroll down to **Customize template**
3. **Subject:** Keep as `Verify your email for %APP_NAME%` or change to:
   ```
   Verify Your Email - PLV CEIT Digital Classroom
   ```
4. Click **Edit template**
5. Open `email-templates/email-verification-template.html`
6. Copy the entire HTML content
7. Paste it into the **Email body** field
8. Click **Save**

### Step 3: Update Password Reset Template

1. Click on **Password reset**
2. Scroll down to **Customize template**
3. **Subject:** Keep as `Reset your password for %APP_NAME%` or change to:
   ```
   Reset Your Password - PLV CEIT Digital Classroom
   ```
4. Click **Edit template**
5. Open `email-templates/password-reset-template.html`
6. Copy the entire HTML content
7. Paste it into the **Email body** field
8. Click **Save**

### Step 4: Update Email Change Template

1. Click on **Email address change**
2. Scroll down to **Customize template**
3. **Subject:** Keep default or change to:
   ```
   Confirm Email Change - PLV CEIT Digital Classroom
   ```
4. Click **Edit template**
5. Open `email-templates/email-change-template.html`
6. Copy the entire HTML content
7. Paste it into the **Email body** field
8. Click **Save**

### Step 5: Update Sender Information (Optional)

1. In **Authentication** → **Templates**
2. Update **Sender name** to: `PLV CEIT Digital Classroom`
3. **Reply-to address**: Keep as `noreply` or set to your support email

## Template Variables

Firebase automatically replaces these variables:

- `%APP_NAME%` - Your app name (plv-ceit-classroom)
- `%DISPLAY_NAME%` - User's name
- `%LINK%` - Action link (verification, reset, etc.)
- `%EMAIL%` - User's email address

## Testing the Templates

1. Try signing up with a new account to see the verification email
2. Use "Forgot Password" to test the password reset email
3. Check that all links work correctly
4. Verify the design looks good on desktop and mobile

## Template Design

- **Colors:** Blue gradient (#2563eb to #4f46e5) matching your app
- **Logo:** PLV circle badge
- **Typography:** System fonts for better compatibility
- **Layout:** 600px wide, mobile-responsive
- **Branding:** PLV CEIT throughout

## Customization

You can customize:
- Header colors (change the gradient colors)
- Button colors (change the button background)
- Logo (replace the PLV text with an image URL)
- Footer text (update school information)

## Preview

The templates include:
- **Header:** Blue gradient with PLV logo
- **Content:** Clear message with CTA button
- **Security Notice:** Warning boxes for important info
- **Footer:** School branding and contact info

---

**Need help?** Contact the system administrator or refer to [Firebase Email Template Documentation](https://firebase.google.com/docs/auth/custom-email-handler).
