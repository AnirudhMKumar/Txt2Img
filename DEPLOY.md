# How to Deploy Your AI Image Generator Site

You have several easy options to deploy your static website for free. Here are the recommended methods:

## Option 1: Vercel (Recommended)
Vercel is extremely fast and easy to use.

### Method A: Drag & Drop (No Code)
1. Go to [Vercel Import](https://vercel.com/new).
2. Sign up or Log in.
3. You will see an area to "Import Git Repository" or a section to upload. If you don't use Git, you can install the Vercel CLI.
   - **Alternative (Easiest for non-coders):**
     1. Install Vercel CLI: `npm i -g vercel`
     2. Run `vercel` in this folder terminal.
     3. Follow the prompts (press Enter for defaults).
     4. done! It will give you a live URL.

### Method B: Using Git
1. Push your code to a GitHub repository.
2. Go to Vercel, click "Add New Project".
3. Select your GitHub repository.
4. Click "Deploy".

## Option 2: Netlify Drop
Netlify allows you to simply drag and drop your folder to deploy.

1. Go to [Netlify Drop](https://app.netlify.com/drop).
2. Drag the `TexttoImage` folder onto the page.
3. It will deploy instantly.
4. You can claim the site to customize the URL.

## Option 3: GitHub Pages
If you are using GitHub:

1. Create a repository on GitHub.
2. Push your code to it.
3. Go to Repository Settings > Pages.
4. Select "main" branch as the source.
5. Save. Your site will be live at `https://yourusername.github.io/repository-name`.

## Important Note regarding Puter.js
This application uses `Puter.js` for AI functionality.
- Using it on a live domain is generally supported.
- If users encounter limits, they may be prompted to sign in to Puter.com account.
- No API keys are visible in your code, which is good for security.
