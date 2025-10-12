# MCP Server Setup Instructions

## Quick Start

1. Copy the .mcp.json template that matches your use case
2. Save it in your project root
3. Create .env file from .env.example
4. Set your API keys in .env
5. Restart VS Code
6. Type `/mcp` in Claude Code to authenticate

## Files to Copy

FROM templates → TO your project root:
- `example-XXX.mcp.json` → `.mcp.json` (choose one)
- `.env.example` → `.env` (fill in your keys)
- `.gitignore` → `.gitignore` (or append to existing)

## What Goes Where

```
your-project/
├── .mcp.json          ← Copy from templates folder
├── .env               ← Create from .env.example
├── .gitignore         ← Include .env in here
└── [your code files]
```

## After Setup

Test each MCP server:
- "Open a browser and navigate to example.com"  (Playwright)
- "Show me test customers"                      (Stripe)
- "Show me open issues"                         (Linear)

## Need Help?

Check `troubleshooting-checklist.pdf` or post in community!

## Available Templates

- **example-fullstack.mcp.json** → Web apps with payments & deployment
- **example-agency.mcp.json** → Client management with different credentials
- **example-devops.mcp.json** → Infrastructure & monitoring
- **example-saas.mcp.json** → SaaS product with full stack
- **example-testing.mcp.json** → QA & automated testing

Choose the one that best matches your project type!