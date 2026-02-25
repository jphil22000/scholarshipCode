# Hosting the Scholarship Finder on EC2

This guide covers building the Vue app and serving it on an Amazon EC2 instance so you can host the site yourself while using the same AWS API and Cognito auth.

## Seamless Cognito Hosted UI flow

The app uses a **Node.js + openid-client** server that serves the **Vue app** and handles Cognito Hosted UI login. One URL, one flow:

1. **Configure your Cognito app client**: Allowed callback URLs (e.g. `http://localhost:3003/callback`), Allowed sign-out URLs (e.g. `http://localhost:3003/`), and OIDC scopes **openid**, **email**, **profile**.
2. In `.env` set: `COGNITO_ISSUER_URL`, `COGNITO_CLIENT_ID`, `COGNITO_CLIENT_SECRET`, `COGNITO_CALLBACK_URL`, `COGNITO_LOGOUT_DOMAIN`, `SESSION_SECRET`.
3. **Build and run:** `npm run build && npm start` (default port 3003).
4. Open **http://localhost:3003** → you see the Scholarship Finder Vue app. Click **Sign In** → redirect to Cognito → sign in → redirect back to the app with your email in the nav and full access. **Sign Out** clears the session and Cognito.

The server serves the built Vue app from `dist/`, exposes `/api/me` (session), `/login`, `/callback`, and `/logout`, so the transition is seamless.

## 1. Build the frontend

From the project root, set your API and Cognito env vars (see `.env.example`), then build:

```bash
cp .env.example .env
# Edit .env: set VITE_API_URL, VITE_COGNITO_USER_POOL_ID, VITE_COGNITO_CLIENT_ID

npm install
npm run build
```

The output is in `dist/` (static files: `index.html`, JS, CSS).

## 2. EC2 instance

- Launch an **Amazon Linux 2** or **Ubuntu** instance (e.g. t3.micro).
- Open **port 80** (and 443 if using HTTPS) in the instance security group.
- SSH in: `ssh -i your-key.pem ec2-user@<public-ip>`

## 3. Serve the app on the EC2 instance

### Option A: Nginx (recommended)

```bash
sudo yum install -y nginx   # Amazon Linux
# or: sudo apt install -y nginx   # Ubuntu

sudo mkdir -p /var/www/scholarship
# Upload and extract your dist/ contents to /var/www/scholarship
# (e.g. scp -r dist/* ec2-user@<ip>:/tmp/dist && sudo cp -r /tmp/dist/* /var/www/scholarship/)
```

Create a server block (e.g. `/etc/nginx/conf.d/scholarship.conf`):

```nginx
server {
    listen 80;
    server_name _;   # or your domain
    root /var/www/scholarship;
    index index.html;
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

Then:

```bash
sudo nginx -t
sudo systemctl enable nginx
sudo systemctl start nginx
```

### Option B: Node.js static server

```bash
sudo yum install -y nodejs   # or apt install nodejs
# Upload dist/ and a small server script (see below), then:
node server.js
# Or run under systemd/PM2 for production
```

Example `server.js` in the same directory as `dist/`:

```js
const express = require('express');
const path = require('path');
const app = express();
app.use(express.static(path.join(__dirname, 'dist')));
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'dist', 'index.html')));
app.listen(80);
```

## 4. Environment variables for the built app

The build bakes `VITE_*` values into the JS at **build time**. So:

- Build the app on your machine (or in CI) with the correct `.env` for production:
  - `VITE_API_URL` = your API Gateway URL
  - `VITE_COGNITO_USER_POOL_ID` and `VITE_COGNITO_CLIENT_ID` = Cognito outputs from your SAM stack
- Upload the **resulting** `dist/` to EC2. Do not rely on `.env` on the server for Vite vars; they are already in the bundle.

## 5. Cognito redirects (if you add a domain later)

If you use a custom domain (e.g. `https://scholarship.example.com`):

1. In **Cognito → User pool → App integration → App client**, add the production URL to **Allowed callback URLs** and **Allowed sign-out URLs** (e.g. `https://scholarship.example.com/`, `https://scholarship.example.com/signin`).
2. For HTTPS on EC2, use Let’s Encrypt with Certbot and point Nginx to the certificate.

## 6. Summary

| Step | Action |
|------|--------|
| 1 | Set `.env` (API + Cognito), run `npm run build` |
| 2 | Launch EC2, open ports 80/443 |
| 3 | Install Nginx (or Node), deploy `dist/` to `/var/www/scholarship` |
| 4 | Configure Nginx `try_files` for SPA routing |
| 5 | When using a domain, update Cognito URLs and add HTTPS |

Your API and Cognito User Pool stay in AWS (Lambda, API Gateway, Cognito); EC2 only serves the static frontend and talks to those services over the internet.
