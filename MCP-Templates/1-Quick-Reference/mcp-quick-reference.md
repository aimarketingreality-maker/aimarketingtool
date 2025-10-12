# MCP Server Quick Reference Card
*For Claude Code Users*

## Essential Commands

### Add MCP Server
```bash
claude mcp add <name> <command> <args>
```

### Scopes
```bash
--scope local   → Just you, this project (default)
--scope project → Team shared via .mcp.json
--scope user    → You, all projects
```

## Common Servers

### Playwright (Browser Automation)
```bash
claude mcp add playwright npx @playwright/mcp@latest
```
**Use for:** Testing, web scraping, screenshots

### Stripe (Payments)
```bash
claude mcp add --transport http stripe https://mcp.stripe.com
```
**Use for:** Payment processing, customer management

### Linear (Project Management)
```bash
claude mcp add --transport sse linear https://mcp.linear.app/sse
```
**Use for:** Issue tracking, project planning

### Netlify (Deployment)
```bash
claude mcp add --transport http netlify https://netlify-mcp.netlify.app/mcp
```
**Use for:** Site deployment, DNS management

### Notion (Documentation)
```bash
claude mcp add --transport http notion https://mcp.notion.com/mcp
```
**Use for:** Knowledge base, documentation

## Using MCP Servers in Claude Code

### Method 1: Natural Language
```bash
"Show me failed Stripe payments from last week"
```

### Method 2: @ Mentions
```bash
@stripe:customer://cus_xxxxx
```

### Method 3: / Commands
Type `/` to see available commands

## Authentication
Type `/mcp` in Claude Code to authenticate services

## Troubleshooting

### Server Not Working?
1. Check configuration exists (.mcp.json or VS Code settings)
2. Restart VS Code
3. Re-authenticate via `/mcp`
4. Check logs in Output panel

### Windows Users
Wrap npx commands with `cmd /c`:
```bash
claude mcp add playwright cmd /c npx @playwright/mcp@latest
```

### Environment Variables Not Loading?
```bash
# Set environment variable
export VAR_NAME=value  # macOS/Linux
$env:VAR_NAME="value"  # Windows PowerShell
```

Need help? Post in the Skool community with:
- Your .mcp.json configuration (remove secrets!)
- Error messages
- What you were trying to do