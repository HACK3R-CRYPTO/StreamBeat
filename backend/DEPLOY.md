# Backend Deployment Guide

Deploy StreamBeat backend to production. Multiple options available.

## Option 1: Vercel (Recommended)

Vercel works well for Node.js backends. Free tier available.

### Steps

1. Install Vercel CLI:
```bash
npm install -g vercel
```

2. Login to Vercel:
```bash
vercel login
```

3. Navigate to backend directory:
```bash
cd StreamBeat/backend
```

4. Deploy:
```bash
vercel
```

5. Set environment variables in Vercel dashboard:
   - Go to your project settings
   - Add environment variables:
     - `REWARDS_ADDRESS=0xC947EF14370F74ccE4d325ee4D83d9B4f3639da7`
     - `RPC_URL=https://dream-rpc.somnia.network`
     - `PRIVATE_KEY=0xyour_private_key`
     - `PORT=3001`

6. Redeploy after adding env vars:
```bash
vercel --prod
```

Your backend will be live at: `https://your-project.vercel.app`

## Option 2: Railway

Railway provides simple Node.js deployment. Free tier available.

### Steps

1. Go to https://railway.app
2. Sign up or login
3. Click "New Project"
4. Select "Deploy from GitHub repo" or "Empty Project"
5. If empty project:
   - Click "Add Service"
   - Select "GitHub Repo"
   - Choose your StreamBeat backend folder
6. Railway auto-detects Node.js
7. Add environment variables in Railway dashboard:
   - `REWARDS_ADDRESS=0xC947EF14370F74ccE4d325ee4D83d9B4f3639da7`
   - `RPC_URL=https://dream-rpc.somnia.network`
   - `PRIVATE_KEY=0xyour_private_key`
   - `PORT=3001`
8. Railway auto-deploys

Your backend will be live at: `https://your-project.railway.app`

## Option 3: Render

Render offers free tier for Node.js apps.

### Steps

1. Go to https://render.com
2. Sign up or login
3. Click "New +" then "Web Service"
4. Connect your GitHub repo
5. Select backend directory
6. Configure:
   - Name: streambeat-backend
   - Environment: Node
   - Build Command: `npm install`
   - Start Command: `node server.js`
7. Add environment variables:
   - `REWARDS_ADDRESS=0xC947EF14370F74ccE4d325ee4D83d9B4f3639da7`
   - `RPC_URL=https://dream-rpc.somnia.network`
   - `PRIVATE_KEY=0xyour_private_key`
   - `PORT=3001`
8. Click "Create Web Service"

Your backend will be live at: `https://your-project.onrender.com`

## Option 4: Heroku

Heroku requires credit card but offers free tier.

### Steps

1. Install Heroku CLI:
```bash
npm install -g heroku
```

2. Login:
```bash
heroku login
```

3. Navigate to backend directory:
```bash
cd StreamBeat/backend
```

4. Create Heroku app:
```bash
heroku create streambeat-backend
```

5. Set environment variables:
```bash
heroku config:set REWARDS_ADDRESS=0xC947EF14370F74ccE4d325ee4D83d9B4f3639da7
heroku config:set RPC_URL=https://dream-rpc.somnia.network
heroku config:set PRIVATE_KEY=0xyour_private_key
heroku config:set PORT=3001
```

6. Deploy:
```bash
git push heroku main
```

Your backend will be live at: `https://streambeat-backend.herokuapp.com`

## Environment Variables Required

All platforms need these environment variables:

- `REWARDS_ADDRESS`: Your deployed rewards contract address
- `RPC_URL`: Somnia Testnet RPC URL
- `PRIVATE_KEY`: Backend wallet private key (with 0x prefix)
- `PORT`: Server port (usually auto-set by platform)

## Security Notes

- Never commit `.env` file to Git
- Use platform's environment variable system
- Keep private key secure
- Backend wallet needs SOMNI for gas fees

## Testing Deployment

After deployment, test your backend:

1. Health check:
```bash
curl https://your-backend-url/health
```

2. Test score submission:
```bash
curl -X POST https://your-backend-url/api/submit-score \
  -H "Content-Type: application/json" \
  -d '{
    "playerAddress": "0x...",
    "scoreData": {
      "score": 1500,
      "gameTime": 30000,
      "perfect": 50,
      "good": 30,
      "miss": 10
    }
  }'
```

## Update Frontend

After deploying backend, update frontend to use new backend URL:

1. Update frontend `.env.local`:
```env
NEXT_PUBLIC_BACKEND_URL=https://your-backend-url
```

2. Update frontend API calls to use `NEXT_PUBLIC_BACKEND_URL`

## Troubleshooting

Backend not responding:
- Check environment variables are set correctly
- Verify backend wallet has SOMNI for gas
- Check platform logs for errors

Score submission fails:
- Verify REWARDS_ADDRESS is correct
- Check backend validator is set in contract
- Ensure RPC_URL is correct

CORS errors:
- Backend has CORS enabled for all origins
- If issues persist, check platform CORS settings

