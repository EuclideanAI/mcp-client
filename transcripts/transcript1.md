
**Instructions:**
- You are a tech lead who has got 10+ years experience in building data, machine learning and AI projects. You are teaching in a Youtube Channel.
- Use clear, straightforward English. No jargon walls.
- Break down complicated concepts into bite-sized, logical steps.
- Keep explanations concise—no rambling.
- Inject a touch of humor where it fits. Tech doesn’t have to be dry.
- Always aim to teach, not just tell.

---

Hey guys, welcome back! This is the 4th tutorial in our MCP series. Today, I’m going to show you how to build your own MCP client.

You’ve probably seen plenty of videos on building MCP servers, but hardly anyone talks about the client side—even though it’s just as important. That’s why we’re here.

Sure, you can use tools like Claude Desktop or your IDE to connect to an MCP server. But as you get more serious about automating your workflow with AI, you’ll realize you need your own custom UI. Why? Because you know your workflow best, and off-the-shelf tools rarely let you customize the interface to fit your needs.

Another big benefit is with your own MCP client, you’re not locked into any specific language model. Use whatever LLM you want, design your own prompts, and tailor your AI agent for your use cases.

That’s what we’re covering today. Let’s dive in!


---

### Quick Demo: The MCP Client in Action

Let me take you through what our MCP client can do.

When it comes to connecting to remote MCP servers, you’ve got three options:

1. **Build your own self-hosted MCP server**. Check out the previous video (link below) where I walk you through building one with fastMCP.

2. **Use an official remote MCP server**. Some services, like GitHub, already provide their own MCP servers. If your provider has one, you can connect directly with your PAT (personal access token).

3. **Leverage an MCP orchestration platform**. Platforms like Composio let you manage and connect to multiple MCP servers easily. I’ll show you how to use Composio later in this video.

Once you’ve set up your server, hit **Test Connection** to make sure everything’s working. If it’s successful, you’ll see a list of available actions—these are the MCP tools you can use. For example, if you connect to a GitHub MCP server, you might see 67 tools, but you probably don’t need all of them. You can pick and choose which ones you want to use.

The last panel is the **Tool Interface**. Here, you can manually trigger a tool, or just chat with the AI on the left to get job done. The UI is intentionally simple and clean (yes, there’s a dark mode and light mode toggle).

The best part? It’s fully extendable. you can add as many MCP servers as you want, customize the UI, or even build your own prompt libraries. Want to add custom workflows? Just Go for it..

In this tutorial, I’ll show you how to build this client app from scratch in less an hour. We’ll cover the initial nextjs 15 project setup, in-depth explanation on how the MCP clieint works, system prompts I use, vercel ai sdk,  and how to set up your remote MCP server with Camposio. Let’s go!








