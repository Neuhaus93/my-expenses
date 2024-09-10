# Welcome

## Contribute

- Fork the repository
- Make sure you have up to date **Docker** and **pnpm**
- Set up your local
  - The easiest way is to run the start script, with `sh ./dev-start.sh`
  - This will create an `.env` file, and start a `postgresql` container
  - You will need valid `CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` variables. You can get that by creating a free Clerk account and creating a project
  - [To be GREATLY improved] Create an account in Clerk, and add the account `userId` to the `user` table
  - Run the app with `pnpm dev`
- Create a branch and feel free to open a Pull Request with your contribution. Thanks in advance!

## This Project uses Remix

- 📖 [Remix docs](https://remix.run/docs)

## Development

Run the dev server:

```shellscript
npm run dev
```

## Deployment

First, build your app for production:

```sh
npm run build
```

Then run the app in production mode:

```sh
npm start
```

Now you'll need to pick a host to deploy it to.

### DIY

If you're familiar with deploying Node applications, the built-in Remix app server is production-ready.

Make sure to deploy the output of `npm run build`

- `build/server`
- `build/client`

## Styling

This template comes with [Tailwind CSS](https://tailwindcss.com/) already configured for a simple default starting experience. You can use whatever css framework you prefer. See the [Vite docs on css](https://vitejs.dev/guide/features.html#css) for more information.
