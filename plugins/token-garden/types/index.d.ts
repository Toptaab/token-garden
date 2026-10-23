export type Limit = { percent: number; resetsAt: string | null }

export type Limits = { session: Limit | null; week: Limit | null }

export type Forecast = {
  tokens: number
  window: number
  percent: number
  delta: number | null
  model: string
  effort: string | null
  session: Limit | null
  week: Limit | null
}

declare module 'claude-code' {
  interface PluginState {
    'token-garden': {
      forecast: Forecast | null
      // Whether the person put the band away with /garden.
      hidden: boolean
    }
  }
}
