/** Host half: independent of Better Sidebar. */
import Schema from '@deepseek-ai/schemastery'
import type { Context } from '@deepseek-ai/cordis'
import { registerTools } from './tools.ts'

export interface PluginConfig {}
export const Config: Schema<PluginConfig> = Schema.object({})
export const name = 'dsh-uml'
export const inject = ['tools']

export function apply(ctx: Context, _config: PluginConfig): void {
  ctx.effect(() => registerTools(ctx), 'dsh-uml: PlantUML tools')
}
