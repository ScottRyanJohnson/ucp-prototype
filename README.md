This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Using MCP (Model Context Protocol)

This prototype supports UCP over **both REST and MCP**. The **browser UI (TV and Shop) can use MCP** for checkout when the MCP server is running.

### Demo: browser UI over MCP

1. Start the Next.js app: `npm run dev` (merchant at http://localhost:3000).
2. In another terminal, start the UCP MCP server:
   ```bash
   npm run mcp:http
   ```
   It listens at **http://127.0.0.1:7001/mcp** and proxies tool calls to the merchant.
3. Open the TV at http://localhost:3000/tv, ask to order, then place an order. The create and complete steps go through the MCP server (create_checkout and complete_checkout tools). If the MCP server is not running, the UI falls back to REST automatically.

### MCP for external clients

Connect any MCP client (e.g. Cursor, or another agent) to `http://127.0.0.1:7001/mcp`.  
Available tools: `create_checkout`, `get_checkout`, `update_checkout`, `complete_checkout`, `cancel_checkout`.  
The `.well-known` manifest is at **http://localhost:3000/.well-known/ucp** (when the app is running).

For a stdio-based MCP server (e.g. for Cursor config), use:

```bash
npm run mcp:ucp
```

(UCP_BASE_URL defaults to http://127.0.0.1:3000; set it if your app runs elsewhere.)

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
