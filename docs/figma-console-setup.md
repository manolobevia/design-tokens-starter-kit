# Connect Claude Code to Figma

The skills write into your open Figma file through the
[Figma Console MCP](https://github.com/southleft/figma-console-mcp) and its **Desktop Bridge**
plugin. This is a one-time setup. The steps below follow that project's README (NPX setup, the
option it recommends for designers). If anything differs, its README wins.

Works on macOS and Linux. Windows is not supported for now.

## You need

- Claude Code
- Figma Desktop (the desktop app, not the browser)
- Node.js 18 or newer. Check with `node --version`.

## Step 1: Create a Figma access token

1. In Figma, open your account settings and create a new **personal access token**
   (Figma Help: "Manage personal access tokens").
2. Name it `Figma Console MCP`.
3. Give it these scopes: File content (read), File versions (read), Variables (read),
   Comments (read and write).
4. Copy the token right away. It starts with `figd_` and Figma shows it only once.

Treat the token like a password. Do not paste it into a chat, a file in this repo or a screenshot.

## Step 2: Add the server to Claude Code

In a terminal, replace `figd_YOUR_TOKEN_HERE` with your token and run:

```bash
claude mcp add figma-console -s user -e FIGMA_ACCESS_TOKEN=figd_YOUR_TOKEN_HERE -e ENABLE_MCP_APPS=true -- npx -y figma-console-mcp@latest
```

Then restart Claude Code.

## Step 3: Install the Desktop Bridge plugin in Figma

1. Open Figma Desktop and open the file you want to build in.
2. Choose **Plugins → Development → Import plugin from manifest...**
3. Select `~/.figma-console-mcp/plugin/manifest.json`.
4. Run the plugin in your file. It looks for the server on ports 9223 to 9232 and connects by itself.

You only import the plugin once. Each time you work, open your file and run the plugin again.
That file path appears after the server has run once, so finish Step 2 first and use Claude Code
at least once (for example the test below) before importing.

## Step 4: Test the connection

In Claude Code, type:

```
Check Figma status
```

It should report that Figma is connected. Then run a skill, for example `Spacing`.

## If it does not connect

- The plugin must be running in the file you have open. Close and rerun it.
- Restart Claude Code after adding the server.
- If a skill says nothing was written, it names what is missing. It never guesses.
