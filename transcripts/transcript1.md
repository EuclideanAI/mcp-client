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


---

### Step 1: Setting Up Your Next.js 15 Project

Alright, let’s get our hands dirty! First, we’ll spin up a new Next.js 15 project. Open your terminal and run:

```bash
npx create-next-app
```

You’ll get a series of prompts:

- **TypeScript:** Yes 
- **ESLint:** Yes
- **Tailwind CSS:** Yes (for easy styling)
- **Other options:** Go with the defaults 

Once the setup finishes, `cd` into your new project directory. I’m calling mine `mcp-client-tutorial`, but feel free to name yours whatever you like.

---

### Step 2: Why Prompt Engineering Matters

Now, before we write a single line of code, let’s talk about **context engineering**. Think of it as setting the stage for your AI assistant (like Copilot) to actually help you, not just spit out random code.

AI is only as good as the instructions and context you give it. That’s why we’re going to set up a solid folder structure for our prompts right from the start.

---

### Step 3: Organizing Your Prompt Library

Here’s how I like to do it:

1. **Create a folder called `.github`** at the root of your project.
2. Inside `.github`, add a file named `copilot-instructions.md`. This is your “prompt orchestrator”—it tells your AI assistant how to behave and what context to use.
3. Next, create a `prompts` folder inside `.github`. This is where you’ll keep all your detailed, task-specific prompts.

For example:
- `prd.prompt.md` for your project requirements
- `ui.prompt.md` for UI-specific instructions

Why split them up? Because LLMs (large language models) have a limited context window. If you dump everything in at once, you’ll hit that limit fast before AI start doing any coding. By modularizing your prompts, you can feed the AI only what it needs for the task.

---

Alright, folder structure sorted. Next up, we’ll start writing the actual prompts.


---

### Step 4: Writing Your Copilot Instructions

Let’s start with the **copilot-instructions.md** file. This is your “prompt orchestrator”—it sets the ground rules for your AI assistant and gets read in every conversation with AI. The trick here is to keep it short and simple. If it’s too long, you’ll waste precious context window space. 

Here’s my approach:

- **Role Play:** I always kick things off by telling the AI to role play, “You are a full stack AI developer experienced in JavaScript, TypeScript, MCP Server/Client, and Vercel AI SDK.”
- **Mission:** Next, I spell out its mission: “Your job is to manage and implement a custom MCP client interface that integrates with remote MCP servers and the Vercel AI SDK. You’ll do this by reading and following a series of instruction prompts.”
- **Prompt References:** I tell the AI where to find the detailed prompts:
    - **PRD Prompt:** For project requirements and objectives.
    - **Architecture Prompt:** For understanding the MCP client architecture, integration details, and dependencies.
    - **UI Design Prompt:** For UI requirements, component specs, and styling.
- **General Rules:** I include a few high-level coding practices:
    - Use TypeScript.
    - Write comments and docs in Australian English.
    - Plan before coding.
    - Commit after each task (with conventional commit messages).
    - Don’t edit code without committing—makes it easier to roll back mistakes.
    - Use the specified dependencies: Vercel AI SDK, shadcn/ui, Tailwind CSS, and the Model Context Protocol SDK.

---

### Step 5: The PRD Prompt

The **prd.prompt.md** file is even simpler. Just tell the AI what you’re building and the key requirements:

- **Functional:** Web-based MCP client, remote MCP server integration, etc.
- **Non-functional:** Responsive UI, dark/light mode support.

Short, clear, and to the point.

---


### Step 6: The Architecture Prompt

Now, let's talk about the architecture prompt, which is one of the most detailed prompt file that we have. 

**MCP Client Architecture: What You Need to Know**

First up: **stateless connections**. Every time you do something—test a connection, call a tool, list tools—the client spins up a fresh connection, does the job, and shuts it down. No hanging onto connections, no connection pools.

**How do we handle configs?**  
We stash your MCP server settings (URL, bearer token, all that) in `localStorage` for each service. 

**Folder structure?**  
Here’s the lay of the land:
- `app/` — Next.js app router
    - `actions/` — Server-side MCP actions
    - `types/` — Type definitions
    - `utils/` — Hooks, helpers, storage stuff
- `components/` — All your UI bits

**Coding pattern:**  
Every MCP operation is rinse and repeat:
```typescript
export async function someMCPOperation(serviceId: string, ...args) {
    const config = loadServiceConfig(serviceId); // from localStorage
    const client = new MCPServerClient(config);
    await client.connect();
    const result = await client.doSomething();
    await client.disconnect();
    return result;
}
```
No magic, just clear steps.

**How does chat work?**  
We use the Vercel AI SDK. Here’s the flow:
1. You type in the chat panel.
2. That triggers a client-side hook.
3. The hook calls a server-side MCP action.
4. Server does its thing (LLM/MCP operation).
5. Result comes back and pops up in the UI.

**Tool execution:**  
- Tools are registered on the client.
- You trigger them from the UI or chat.
- Each tool call is a stateless server-side action.
- UI updates instantly, thanks to localStorage events.

**Why do it this way?**  
It’s dead simple, reliable, secure, and easy to debug. No connection headaches. Works great for serverless and multi-tenant setups.

Keep this in mind as you build—this is the backbone of your MCP client!
---

### Step 7: The UI Prompt

Finally, the **ui.prompt.md** file. Here, just list the main UI components:

- **Header**
- **Resizable container** (with LLM chat panel and MCP control panel)
- **LLM Chat Panel:** List subcomponents.
- **MCP Control Panel:** List main components.
- **Styling:** Use shadcn/ui and Tailwind CSS, with your chosen color palette.


---

### Step 8: Kicking Off the UI Build

Alright, let’s kick off our actual building process. I always start with the UI components. That's what I normally do in a full-stack project when coding with AI. We will focus on UI first and leave API calls and backend integrations for later. This keeps things simple and lets us see progress quickly.

Here’s what I tell my coding AI agent:  
“Please read the architecture and UI prompt documents we created earlier and start planning the UI implementation. Just build the UI components first—don’t worry about API calls or backend integrations yet.”

The AI starts by reading the prompt orchestrator (`copilot-instructions.md`) by default. It also reads `architecture.prompt.md` and `ui.prompt.md` because we’ve set up the context in `copilot-instructions.md` to point to those files for more details when it needs to.

Next, the AI begins installing dependency packages. I made a small mistake here—I told the AI to install the “Vercel AI” library, but in npm, the package is actually just called `ai`. Luckily, Copilot figured it out and installed the correct library, along with other necessary dependencies like `lucide-react`, `tailwind-merge`, and so on.

Now, it’s creating the components as per our instructions. We’ve got a `components` folder alongside the `app` folder. Under `components`, it creates the UI folder, and also sets up the `lib`, `types`, `utils`, and `actions` folders as specified in our prompt instructions.


Once all the main UI components are created, the AI agent starts editing `global.css` to set up the main CSS configurations with Tailwind. Sometimes, it asks me to confirm if I want to continue—probably a cost-saving measure from Copilot, just in case someone has abandoned the session but the Claude model is still burning compute.

Next, it prompts me to install the Radix UI libraries. You can just click through these pop-ups. Then, it begins creating basic UI components like Collapsible and Separator. It also asks if I want to install the next theme package, which is used for toggling between light and dark modes, as specified in our instructions.

After that, it requests to install the React Resizable Panel—this is the resizable container I mentioned in the prompt. It separates the LLM chat panel from the MCP configuration panel, so you end up with two panels side by side.

Now, it looks like most of the work is done. The AI asks me to run `npm run dev` to spin up the dev server. Let’s check it out!

As expected, the UI isn’t the fanciest or most lovable you’ve ever seen. It’s very basic, but all the functional requirements are there: light mode, dark mode toggle, MCP control panel, tool interface, collapsible buttons. It’s not the prettiest, but that’s okay—we can fix that soon.

Before moving on, don’t forget to commit your code! Add the newly created files and commit them to your git tree, following a normal workflow. This keeps things tidy before we polish up the UI.

Now, let’s move on to the next step: polishing the UI. We’re not ready to sell this UI to anyone, so I just tell the AI agent that the UI needs a bit of work. Since I’ve already created a polished version, I can take a screenshot and ask the AI to replicate the exact layout I made before.

If it’s your first time building a product or MVP, the best way is to visit some UI showcase sites, grab a screenshot of a layout you like, and use it as a prompt for the AI to follow.

Also, I need to be more specific about using the right library. I don’t think the AI strictly followed my instructions yet, so I stress: “Please make sure you use the shadcn/ui components. Don’t create custom components unless necessary. Use shadcn/ui libraries throughout the project wherever possible.” I’ll also update our UI prompt to be more specific for future projects.

Now, the AI coding agent actually understands my requirements. It starts refining the interface and asks me to initiate shadcn/ui. I click yes to proceed, and it installs a bunch of components from shadcn/ui. There are just a few options to click through.

Once these base components are installed and included in the codebase, I can guarantee the UI will look much more polished than the first draft. It doesn’t take much time—after a few minutes, you’ll see a much more refined version. If a human did this, it would probably take days to reach this stage, but with AI, you can vibe code, and finish in minutes.

I’ll speed up the playback here. As you can see, it’s updating our components with shadcn/ui. I’ll skip through the process and show you the actual product.


Cool—so after a few minutes, you’ll see we’ve reached the end of the second step. The AI will pop up a code commit let's commit the code before we go and refresh the dev server to check out the UI update. As you can see now, it’s based on the shadcn UI components library and looks much more polished than the first version. After just a few prompts, most of the main components are ready to go.

On the left-hand side is the LLM chat panel. On the right-hand side is the MCP control panel. You got light/dark mode toggle. You can click on different service tabs to switch between Jira, Confluence, GitHub, Slack, and some other cloud services—these are mostly just placeholders for now. You’ve got server configuration, and the available actions panel, interface panel. Most of the key components are here.

Cool—after a few vibe coding iterations on the UI, we should be in a reasonable good position to start the backend logic. Now, let’s implement the mcp logic to make this MCP client app work from end to end.

We’ll instruct the Copilot agent to read the architecture documents we created earlier and ask it to plan out the implementation and no coding just yet.

The Copilot agent starts by reading the `architecture.prompt.md` file. It also checks the PRD document to understand the overall requirements and objectives, and reviews the type definitions as a good starting point to see what’s going on. It reads the actions and utilities directories, and comes up with a detailed implementation plan.

First, it lists out the server-side MCP actions we need for the MCP operations.

Next, we have the client-side storage and mcp utilities. The storage utilities handle localStorage management for saving MCP server configurations and tool selections on the client side. Each time you make an MCP call, you don’t want to re-enter the server configurations—localStorage is a good place to store these, along with tool selections. 

The MCP client hooks—these are React hooks that wrap the server actions. When an MCP operation is invoked on the client side (for example, when you click “Execute MCP Tool” from a component), you need a custom hook to link the client-side component to the actual server-side actions. If you are not familiar with the client side hook wrapping the server side actions, don't worrry too much. I will explain this in a diagram. For now, let's just go through the whole implementation plan. 

Next is the AI chat integration, which is also a server-side action. This handles model selection, tool registration, and all LLM interactions via the Vercel AI SDK. We also need a custom chat hook to manage communication between the client-side component and the server-side actions.

Then, there’s the tool registry and selection utilities, which handle tool selection and decide what tools to load for each MCP call.

Here’s an example of an asynchronous function for implementing an MCP operation, along with some type definitions.

Now, here’s the suggested order of implementation: Copilot recommends starting with the storage utility functions, since they’re independent of the other steps—a good decision. Next, it moves on to creating the server-side actions, which is also reasonable. After those are set up, it will complete the client-side hooks. Then, it handles tool registry, dynamic tool loading, and selection management. It leaves the chat integration for last, so the chat providers, chat actions, and custom chat hooks are done at the end.

Copilot summarizes the key benefits of this architecture: simplicity, reliability, and security.


---

### How Client-Side Hooks Manage Tool Execution

If you are not familiar with the client side hooks, Let’s break down how they help us trigger MCP tool calls and interact with server-side actions.

Suppose you have an “Execute” button in your UI for the MCP tool called “Get Me on GitHub.” When you click this button, here’s what happens:

1. **Button Click:** The button triggers the `executeTool` function, which is exposed by the `useToolExecution` hook.

2. **Hook Responsibilities:**  
    - The hook loads the service configuration (like URL and bearer token) from localStorage using a utility in `storage.ts`.
    - It manages execution state: whether it’s running, finished, or errored.
    - It clears previous results before starting a new execution.

3. **Calling the Server Action:**  
    - Once the config is loaded, the hook calls the asynchronous server-side function `callMCPTool`.
    - This is the actual function that performs the MCP operation by connecting to the remote MCP server and executing the tool.

4. **Handling Results:**  
    - When the server returns a result, the hook updates its state with the result, user parameters, timestamp, status, and any error messages.
    - The UI then displays the execution result to the user.

So, the hook acts as a bridge: it manages the local states, loads configs from the local storage, triggers server-side actions, and updates the UI with results. All the heavy lifting (connecting to the MCP server and running the tool) happens at the server-side, while the hook keeps your UI reactive and up-to-date.

---

### Step 9: Implementation Steps and AI Collaboration

So let's kick off the first step, which is building the storage utility functions. This is a relatively standard, textbook implementation, so AI can actually do this with ease. It only takes a couple of minutes, so let's commit our code at each step.

One strategy I want to share for AI-augmented programming is to commit code as frequently as possible, just in case you need to revert any changes made by AI. You can use Copilot to do a no-code commit for you, but I usually just write the commit message myself. One reason is to save token usage: if you get AI to write a commit for you, it counts as one API request to the Claude model. The premium model consumption isn’t unlimited with Copilot, so if you can do it with a one-line message, just do it yourself.

Now, the second step is to implement the server-side actions for the MCP client-to-server connection. Anthropic already provides standard templates and code snippets on the main MCP documentation site. You can just click on the tab on the left-hand side called "For Client Developers." There, you'll find a full Node.js code snippet showing how the MCP client-to-server connection script works. It’s a standard stateless client/server connection script. You can tell the Copilot agent to refer to the reference doc to understand how the client connections work. Just paste the URL of the documentation page, and since the copilot has internet access, it will ask for permission to fetch the web page—just click OK. It will read the whole page, check if the MCP SDK is already installed based on your package.json, and once confirmed, it started writing the actual server-side actions based on the example snippets from MCP’s documentation.

One thing to point out: when Copilot initially wrote the server-side action script, it used the deprecated SSE (Server-Sent Events) transport for remote server connections. This has recently been deprecated, and Anthropic now recommends using streamable HTTP connections for remote client-to-server connections. This change happened only a couple of months ago, so the training data might not cover it. That’s where humans need to step in and review or change any architectural decisions made by AI. This is a good example of that scenario.

When it comes to textbook implementations, AI can do them at scale—no human can possibly match that. But when there are updates not included in the training data, we as humans still need to review and make those decisions. Otherwise, AI might make a mess or continue with outdated code, which later becomes a tech debt in production. So I stepped in and asked the AI to look for the streamable HTTP transport in the SDK and swap it in for the SSE. After a quick search, Copilot found the streamable HTTP transport and replaced the original SSE implementation. One thing it didn’t do well was forgetting to delete the import for SSE, and there were a couple of examples I had to tidy up myself, but overall it did a good job. It implemented the server-side actions with no other problems. Let's commit our code again—I’ll just write a manual commit message to save on token consumption.

Now, the third step is to implement the client-side hook. As I explained in the last section, this is another textbook implementation, and AI was able to do it with ease. It implemented six custom use hooks in just a few minutes—very efficient for standard implementations. We can commit our code again for the client-side hooks, and that marks three steps—already half done with our backend implementation. The whole process took just about 30 minutes.

---

Since now we've got the MCP control panel working and implemented the server actions and client side hooks for the MCP connection, the last bit is the AI chat. I started a new chat—you can continue with the previous chat, but the problem is Claude Sonnet has a context window limit of 200K tokens. So if you continue in a previous chat, that means every time it's about to reach the context window limit, it starts summarizing the conversation, and I normally find that's when the response quality starts dropping. 

When I see Copilot is doing a summary of the previous conversations, that's a sign that I need to start a new chat. Depending on what tasks we get Copilot to do, I normally keep each separate main task in a different chat. So we start a new chat and tell Copilot to read the architecture doc again. we will ask Copilot do a plan for implementation of the AI chat, but not start coding yet. Again, it's reading the architecture.prompt.md file and also checking all the previous work we've done. It's figuring out the implementation details.

The only correction I was instructing Copilot was to not use the AWS SDK or the Google Generative AI SDK for Gemini. Instead, I wanted to use the AI SDK from Vercel. Vercel provides a few wrappers for those original AWS or Google AI SDKs. The main reason is we use the Vercel AI SDK throughout the project, and it has pretty good integration for the client-side hook, so we might as well keep it consistent. There's nothing wrong with using the original AWS or Google AI SDKs—it just means we need to do a lot of boilerplate code ourselves. So that's the instruction I gave to Copilot, and it was able to understand and updated its implementation plan and replaced the AWS/Google SDKs, with the AI SDK from Vercel.

Cool, let's get Copilot to implement it. First step is installing the dependency packages. then, it starts creating the chat provider and also the tool registry for the AI SDK integration. Then it's creating the permission system. Everything is going as planned, and step 6 is creating a custom useChat hook. 

So yeah, as you can see, that's the UI we developed so far. You can select the tools you want to use on the right-hand side. Before we can get the AI chat working, we need to grab the credentials from AWS or GCP. For demonstration purposes, I'll just quickly grab the API key from Google AI studio. If it's AWS Bedrock, you'll need to grab the access key ID and secret access key to have the agents on Bedrock working. For Google, you just need a API key. So grab the API key from your account and just put it into the .env file for now.

Let's quickly send a message to the AI chat and see if we can get any response. It doesn't look like we've got the response yet, so let's just ask Copilot to double-check what's going on.Copilot was diagnosing the issue. 
We actually saw an error in the response payload, and that's actually to do with the formatting of the tools that we are appending to the vercel ai sdk calls. It took a few iterations to fix this. But once it's fixed, we were able to fire a MCP chat and get the response back on the chat panel. 

At this stage, we are 99% completed with the mcp client. 

Let me explain to you how the ai chat works under the hood. 

The main chat UI is implemented in a component called chatPanel. Users interact via the chat panel to send prompts, and see responses. The core element of the chat panel is a React use hook called useChat. useChat is a custom hook; however, it's built on top of the existing Vercel ai SDK usechat, plus our custom MCP tool integration.

So the useChat hook does the following: it manages the chat messages at the client side, adjusts the inputs, updates the input state loading, triggers the tool calls, and handles the permission requests. 

And we mentioned about the useToolRegistry in the MCP section, The hook listens to tool changes and updates the AISDK tool list accordingly. Tool selection is managed in local storage and updated in real time using custom events. 

When a user sends a message, useChat calls an API endpoint called 'api/chat', which will have prompt, selected model ID and list of the enabled MCP tools that we want to include in this particular conversation.

The API route validates the model, converts the message and tools metadata to be compatible with vercel ai sdk, and streams the response from the AI provider, which is Gemini in this scenario. 

It's important to know Tools are sent as metadata only. The actual execution is handled at the client side. So if AI decides to use a tool, the Vercel AISDK triggers a callback function included in use chat hook called 'onToolCall'. When this callback is triggered, it brings the tool call parameters that returned by the Gemimni AI and use them to trigger a server side async function called 'executeChatTool', this function handles the actual execution of the tool Call and connect to the MCP server.  

And that wraps up the full cycle of the AI chat integration! There’s plenty more to explore and dive deeper into, but this covers the essentials. I’ll drop the GitHub repo link below—feel free to check it out, and don’t hesitate to leave any questions in the comments. I’m always happy to help!












