# Customizing Firebase Password Reset Email Page

The screenshot shows Firebase's default password reset page. To use your own custom styled page, you need to configure Firebase to use your app's URL for handling password reset actions.

## Option 1: Update Firebase Email Action URL (Recommended)

### Step 1: Update Firebase Email Templates

1. Go to **Firebase Console** → **Authentication** → **Templates**
2. Click on **Password reset** email template
3. Click **Customize action URL**
4. Enter your app's URL: `http://localhost:5173/reset-password` (for development)
   - For production: `https://yourdomain.com/reset-password`
5. **Save**

### Step 2: Create Custom Reset Password Handler

Your app needs to handle the password reset link with the `oobCode` parameter.

## Option 2: Customize Firebase Hosted Page (Limited Styling)

You can customize the Firebase-hosted page colors and logo:

1. Go to **Firebase Console** → **Authentication** → **Settings**
2. Scroll to **Customize email action handler**
3. Click **Customize**
4. Add your:
   - Project name
   - Project logo URL
   - Primary color
   - Background color

This provides basic styling but is limited compared to a fully custom page.

## Option 3: Use Custom Domain (Production)

For production, you can use a custom domain with full control:

1. Set up Firebase Hosting
2. Deploy your custom reset page
3. Configure action URL to use your custom domain

## Recommended Approach

For the best user experience:
1. Use **Option 1** - redirect to your custom app page
2. Handle the reset in your app with full branding
3. The PasswordResetPage.tsx component you have is perfect for this!

---

Let me create the handler page for you that will work with Firebase's email links.
