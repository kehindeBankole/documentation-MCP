import { McpAgent } from "agents/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { AgentContext } from "agents";

interface Env {
  API_HOST: string;
}

export class MyMCP extends McpAgent {
  env = "";
  constructor(ctx: AgentContext, env: Env) {
    super(ctx, env);
    this.env = env.API_HOST;
  }
  server = new McpServer({
    name: "Documentation Content Server",
    version: "1.0.0",
  });

  async init() {
    this.server.tool(
      "get_documentation_content",
      {
        url: z
          .string()
          .url()
          .describe(
            "The URL of the documentation page you want to extract content from"
          ),
      },
      async ({ url }) => {
        try {
          const docUrl = `${this.env}/?url=${encodeURIComponent(url)}`;

          const response = await fetch(docUrl);

          if (!response.ok) {
            return {
              content: [
                {
                  type: "text",
                  text: `Error: Failed to fetch content from ${url}. Status: ${response.status}`,
                },
              ],
            };
          }

          const content = await response.text();

          return {
            content: [
              {
                type: "text",
                text: `Content from ${url}:\n\n${content}`,
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: "text",
                text: `Error fetching content from ${url}: ${
                  error instanceof Error ? error.message : "Unknown error"
                }`,
              },
            ],
          };
        }
      }
    );
  }
}

export default {
  fetch(request: Request, env: Env, ctx: ExecutionContext) {
    const url = new URL(request.url);

    if (url.pathname === "/sse" || url.pathname === "/sse/message") {
      return MyMCP.serveSSE("/sse").fetch(request, env, ctx);
    }

    if (url.pathname === "/mcp") {
      return MyMCP.serve("/mcp").fetch(request, env, ctx);
    }

    return new Response("Not found", { status: 404 });
  },
};
