export type Limit = { percent: number; resetsAt: string | null }

export type Forecast = {
  tokens: number
  window: number
  percent: number
  delta: number | null
  session: Limit | null
  week: Limit | null
}

declare module 'claude-code' {
  interface PluginState {
    'token-garden': { forecast: Forecast | null }
  }
}
