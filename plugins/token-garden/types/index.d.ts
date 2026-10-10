export type Limit = { percent: number; resetsAt: string | null }

export type Limits = { session: Limit | null; week: Limit | null }

export type Forecast = {
  tokens: number
  window: number
  percent: number
  delta: number | null
  model: string
  session: Limit | null
  week: Limit | null
}

declare module 'claude-code' {
  interface PluginState {
    'token-garden': { forecast: Forecast | null }
  }
}
