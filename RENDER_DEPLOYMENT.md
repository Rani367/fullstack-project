# Render Deployment Instructions

## Overview

This guide explains how to deploy your full-stack application to Render after adding a public landing page.

## What Changed

We've added a public landing page at the root route (`/`) and moved the admin dashboard to `/dashboard`. Here's the routing structure now:

- **`/`** - Public landing page (new)
- **`/login`** - Login page
- **`/signup`** - Sign up page
- **`/dashboard`** - Main dashboard (requires auth)
- **`/items`** - Items management (requires auth)
- **`/settings`** - User settings (requires auth)
- **`/admin`** - Admin panel (requires auth + superuser)

## Deployment Steps for Render

### 1. Backend Changes

No changes needed. The backend API remains the same.

### 2. Frontend Configuration

The frontend now includes:
- A new public landing page at `frontend/src/routes/index.tsx`
- Updated routing to redirect authenticated users to `/dashboard`
- All navigation links updated to point to `/dashboard`

### 3. Render Environment Variables

Update your Render environment variables for the frontend service:

#### Required Environment Variables (add/update):

```bash
VITE_API_URL=https://your-backend-service.onrender.com
```

This should point to your deployed backend service URL on Render.

### 4. Deployment Configuration

#### For the Frontend Service:

1. **Build Command**: 
   ```bash
   npm run build
   ```

2. **Publish Directory**: 
   ```
   dist
   ```

3. **Static Site Configuration**:
   - Render will automatically detect it's a static site
   - No custom headers needed (SPA routing is handled by Nginx)

#### For the Backend Service:

1. **Build Command** (if using Docker):
   - Keep your existing configuration

2. **Environment Variables**:
   - Keep all existing backend environment variables
   - No changes required

### 5. Post-Deployment Verification

After deploying, test these routes:

1. **Public Landing Page**: Visit your root domain - should show the landing page
2. **Authentication**: Click "Get Started" or "Log In" - should redirect to login/signup
3. **Dashboard**: After logging in, should redirect to `/dashboard`
4. **Deep Links**: Test accessing `/items`, `/settings`, `/admin` while logged in

### 6. Important Notes

#### SPA Routing

The frontend uses client-side routing. Render's static hosting handles this automatically, but make sure:

- Your build includes the `dist/index.html` file
- The routing fallback is configured (already handled in `nginx.conf`)

#### Authentication Flow

New flow:
1. User visits `/` → sees public landing page
2. User clicks "Get Started" → redirected to `/signup`
3. User logs in → redirected to `/dashboard` (not `/`)

#### Backward Compatibility

- Existing bookmarks to `/` will work:
  - Logged-out users see the landing page
  - Logged-in users are redirected to `/dashboard`
- All API endpoints remain unchanged

### 7. Optional: Custom Domain Configuration

If using a custom domain with Render:

1. Configure the domain in Render dashboard
2. Update DNS settings as instructed by Render
3. SSL certificates are automatically provisioned

### 8. Testing Checklist

Before going live, test:

- [ ] Landing page loads at root URL
- [ ] Can navigate to `/login` from landing page
- [ ] Can navigate to `/signup` from landing page
- [ ] After login, redirects to `/dashboard`
- [ ] Dashboard loads with user data
- [ ] All protected routes require authentication
- [ ] API calls are working with correct base URL
- [ ] Logout returns to landing page

## Troubleshooting

### Issue: Landing page shows 404

**Solution**: Ensure the build completed successfully and the `dist` directory contains `index.html`

### Issue: Routes return 404 when accessing directly

**Solution**: This is expected for SPAs. The fallback configuration in `nginx.conf` should handle this. If deployed on Render as a static site, ensure Render is configured to serve `index.html` for all routes.

### Issue: API calls failing after deployment

**Solution**: Verify `VITE_API_URL` is set correctly in Render environment variables

## Additional Resources

- [Render Documentation](https://render.com/docs)
- [TanStack Router Documentation](https://tanstack.com/router)
- [FastAPI Documentation](https://fastapi.tiangolo.com)

