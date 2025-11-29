# Deploy Backend to Vercel (Web Dashboard)

Deploy StreamBeat backend using Vercel web interface. No CLI needed.

## Steps

1. Go to https://vercel.com
2. Sign up or login with GitHub
3. Click "Add New Project"
4. Import your GitHub repository
   - Select your StreamBeat repository
   - Or connect repository if not listed
5. Configure project:
   - Framework Preset: Other
   - Root Directory: `backend` (click "Edit" and set to `backend`)
   - Build Command: Leave empty (or `npm install`)
   - Output Directory: Leave empty
   - Install Command: `npm install`
6. Add Environment Variables:
   Click "Environment Variables" and add:
   - `REWARDS_ADDRESS` = `0xC947EF14370F74ccE4d325ee4D83d9B4f3639da7`
   - `RPC_URL` = `https://dream-rpc.somnia.network`
   - `PRIVATE_KEY` = `0xyour_private_key` (from your backend .env file)
   - `PORT` = `3001` (optional, Vercel sets this automatically)
7. Click "Deploy"
8. Wait for deployment to complete
9. Your backend URL will be: `https://your-project-name.vercel.app`

## After Deployment

Test your backend:
- Health check: `https://your-project-name.vercel.app/health`
- API endpoint: `https://your-project-name.vercel.app/api/submit-score`

## Update Frontend

Update your frontend `.env.local`:
```
NEXT_PUBLIC_BACKEND_URL=https://your-project-name.vercel.app
```

## Notes

- Vercel automatically detects Node.js
- Environment variables are encrypted
- Free tier includes 100GB bandwidth
- Auto-deploys on every git push

