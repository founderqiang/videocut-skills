import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const revision = "a".repeat(64);
const cutsRevision = "b".repeat(64);
const transport = new StdioClientTransport({ command: process.execPath, args: ["dist/server.mjs"], cwd: root });
const client = new Client({ name: "chengfeng-videocut-smoke-test", version: "0.1.0" });

try {
  await client.connect(transport);
  const tools = await client.listTools();
  const tool = tools.tools.find((item) => item.name === "show_workflow_confirmation");
  if (!tool) throw new Error("show_workflow_confirmation was not registered");
  const result = await client.callTool({
    name: tool.name,
    arguments: {
      projectId: "project-123",
      stage: "cut_review_ready",
      expectedProjectRevision: revision,
      expectedCutsRevision: cutsRevision,
      selectedCount: 18,
      removedDuration: 42.6,
    },
  });
  if (result.isError) throw new Error("confirmation tool returned an error");
  if (result.structuredContent?.options?.[0]?.action !== "continue_cut") throw new Error("unexpected action contract");
  if (result.structuredContent?.projectId !== "project-123") throw new Error("projectId was not preserved");
  const resource = await client.readResource({ uri: "ui://chengfeng-videocut/workflow-confirm-v1.html" });
  const content = resource.contents?.[0];
  if (!content?.text?.includes("window.openai.sendFollowUpMessage")) throw new Error("follow-up bridge is missing");
  if (!content.text.includes("expectedProjectRevision")) throw new Error("revision handoff is missing");
  console.log(JSON.stringify({
    tool: tool.name,
    resource: content.uri,
    action: result.structuredContent.options[0].action,
    projectId: result.structuredContent.projectId,
  }, null, 2));
} finally {
  await client.close();
}
