import { supabase } from './supabase'

export interface McpTool {
  name: string
  description?: string
  inputSchema: { type: 'object'; properties?: Record<string, unknown>; required?: string[] }
}

export interface McpToolResultContent { type: string; text?: string }
export interface McpToolResult { content: McpToolResultContent[]; isError?: boolean }

async function invoke(body: Record<string, unknown>): Promise<any> {
  const { data, error } = await supabase.functions.invoke('mcp-proxy', { body })
  if (error) throw new Error(error.message ?? 'MCP proxy error')
  if (data?.error) throw new Error(data.error)
  return data
}

export async function listMcpTools(url: string, authHeader?: string): Promise<McpTool[]> {
  const data = await invoke({ url, authHeader, action: 'list_tools' })
  return (data?.tools ?? []) as McpTool[]
}

export async function callMcpTool(
  url: string,
  authHeader: string | undefined,
  toolName: string,
  toolArgs: Record<string, unknown>,
): Promise<McpToolResult> {
  const data = await invoke({ url, authHeader, action: 'call_tool', toolName, toolArgs })
  return (data?.result ?? { content: [], isError: true }) as McpToolResult
}

// Flattens an MCP tool_result's content blocks into plain text for feeding
// back into the model as a tool_result message.
export function mcpResultToText(result: McpToolResult): string {
  const text = result.content.filter(c => c.type === 'text' && c.text).map(c => c.text).join('\n')
  return text || (result.isError ? 'Tool call failed with no message.' : '(empty result)')
}

// Namespaces a site's tools as "{siteSlug}__{toolName}" so multiple connected
// MCP servers (e.g. several WordPress sites) can share one tool list without
// name collisions, and calls can be routed back to the right server.
export function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'site'
}
