import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register, SessionContextUsage, SessionRateLimit } from 'claude-code'

import type { Forecast, Limit, Limits } from '../types'

const forecast = atom({ plugin: 'token-garden', key: 'forecast' } as const, null)

const BAR_CELLS = 20
const MODEL_POLL_MS = 1000
const LIMITS_KEY = 'limits'
const BAR_COLOR = 'green'
// '🌿 Making progress' is the widest label (an icon is two cells), '999.9k / 999.9k' the widest value.
const LABEL_CELLS = 19
const VALUE_CELLS = 16
const ICON_CELLS = 2

const SKIES = [
  { from: 100, icon: '🌲', word: 'Overgrown', color: 'red' },
  { from: 80, icon: '🌳', word: 'Compact soon', color: 'red' },
  { from: 50, icon: '🪴', word: 'Halfway up', color: 'yellow' },
  { from: 25, icon: '🌿', word: 'Making progress', color: 'green' },
  { from: 0, icon: '🌱', word: 'Just started', color: 'green' },
]

const SUNS = [
  { from: 100, icon: '🌑', word: 'No light left', color: 'red' },
  { from: 80, icon: '☁️', word: 'Running low', color: 'red' },
  { from: 50, icon: '⛅', word: 'Over halfway', color: 'yellow' },
  { from: 25, icon: '🌤️', word: 'Filling up', color: 'green' },
  { from: 0, icon: '☀️', word: 'Full sun', color: 'green' },
]

const SEASONS = [
  { from: 100, icon: '❄️', word: 'Out of season', color: 'red' },
  { from: 80, icon: '🍂', word: 'Late season', color: 'red' },
  { from: 50, icon: '🍁', word: 'Peak season', color: 'yellow' },
  { from: 25, icon: '🌻', word: 'In season', color: 'green' },
  { from: 0, icon: '🌿', word: 'Early season', color: 'green' },
]

const tierFor = (tiers: typeof SKIES, percent: number) =>
  tiers.find(tier => percent >= tier.from) ?? tiers[tiers.length - 1]

// An icon is two cells but one to three UTF-16 units, so only the word is padded.
const titled = (icon: string, word: string) => `${icon} ${word.padEnd(LABEL_CELLS - ICON_CELLS - 1)}`

const bar = (percent: number) => {
  const filled = Math.max(0, Math.min(BAR_CELLS, Math.round((percent / 100) * BAR_CELLS)))

  return '█'.repeat(filled) + '░'.repeat(BAR_CELLS - filled)
}

const compact = (tokens: number) => {
  const abs = Math.abs(tokens)

  if (abs >= 1_000_000) {
    return `${(tokens / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`
  }

  if (abs >= 1000) {
    return `${(tokens / 1000).toFixed(1).replace(/\.0$/, '')}k`
  }

  return String(tokens)
}

const clock = (iso: string) => {
  const at = new Date(iso)
  const hours = at.getHours()
  const hh = String(hours % 12 || 12).padStart(2, '0')
  const mm = String(at.getMinutes()).padStart(2, '0')

  return `${hh}:${mm} ${hours < 12 ? 'AM' : 'PM'}`
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const limitOf = (limits: readonly SessionRateLimit[], kind: string): Limit | null => {
  const limit = limits.find(each => each.kind === kind)

  return limit ? { percent: limit.percentUsed, resetsAt: limit.resetsAt ?? null } : null
}

const isLive = (limit: Limit | null | undefined, now: number): limit is Limit =>
  !!limit && (limit.resetsAt === null || Date.parse(limit.resetsAt) > now)

// The engine learns the limits from an API response, so a new session has none until its first turn:
// the last reading any session took stands in, unless its window has since reset.
const limitsOf = async ($: EngineInterface, limits: readonly SessionRateLimit[]): Promise<Limits> => {
  const kept = ((await $.store.get(LIMITS_KEY)) ?? {}) as Partial<Limits>
  const now = await $.clock.now()
  const session = limitOf(limits, 'five_hour') ?? (isLive(kept.session, now) ? kept.session : null)
  const week = limitOf(limits, 'seven_day') ?? (isLive(kept.week, now) ? kept.week : null)

  if (limits.length > 0) {
    await $.store.set(LIMITS_KEY, { session, week })
  }

  return { session, week }
}

const modelOf = async ($: EngineInterface) =>
  (await $.session.model()).replace(/^claude-/, '').replace(/-\d{8}$/, '')

// Before the first request the setting stands in; a request then says what was really asked.
const effortOf = async ($: EngineInterface) => {
  const { effortLevel } = await $.settings.read({})

  return typeof effortLevel === 'string' ? effortLevel : null
}

const forecastOf = (
  prev: Forecast | null,
  context: SessionContextUsage,
  limits: Limits,
  model: string,
  effort: string | null,
  isTurn: boolean,
): Forecast => {
  // No response yet (a fresh or just-cleared session): an empty window, so the band shows from the start.
  const tokens = context.tokens ?? prev?.tokens ?? 0
  const moved = prev && isTurn ? tokens - prev.tokens : null

  return {
    tokens,
    window: context.window,
    percent: context.percent ?? Math.round((tokens / context.window) * 100),
    model,
    // A forecast kept from before the band showed effort has none: undefined, where null says the model takes none.
    effort: prev?.effort !== undefined ? prev.effort : effort,
    delta: moved === null || moved === 0 ? (prev?.delta ?? null) : moved,
    session: limits.session ?? prev?.session ?? null,
    week: limits.week ?? prev?.week ?? null,
  }
}

const measure = async (
  $: EngineInterface,
  context: SessionContextUsage,
  limits: readonly SessionRateLimit[],
  isTurn: boolean,
) => {
  const model = await modelOf($)
  const effort = await effortOf($)
  const known = await limitsOf($, limits)

  await update($, forecast, (prev: Forecast | null) => forecastOf(prev, context, known, model, effort, isTurn))
}

// A /clear empties the session's state and raises no session.start: measure on the spot.
const current = async ($: EngineInterface) => {
  const usage = await $.session.usage()

  return forecastOf(null, usage.context, await limitsOf($, usage.rateLimits), await modelOf($), await effortOf($), false)
}

// A /model switch raises nothing a mod hears, so the model is polled.
const refresh = async ($: EngineInterface) => {
  const model = await modelOf($)
  const shown = await read($, forecast)

  if (shown === null) {
    const usage = await $.session.usage()
    await measure($, usage.context, usage.rateLimits, false)
  } else if (shown.model !== model) {
    await update($, forecast, (prev: Forecast | null) => (prev ? { ...prev, model } : prev))
  }
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const usage = await $.session.usage()
    await measure($, usage.context, usage.rateLimits, false)
    $.clock.every(MODEL_POLL_MS, () => void refresh($))

    return next(e)
  })

  on('session.measure', async ($, e, next) => {
    await measure($, e.context, e.rateLimits, e.changed.includes('context'))

    return next(e)
  })

  // A model that takes no effort is sent none: the band then shows the model alone.
  on('turn.step', async function* ($, e, next) {
    if (e.agentId === undefined) {
      const effort = e.effort === undefined ? null : String(e.effort)
      await update($, forecast, (prev: Forecast | null) => (prev ? { ...prev, effort } : prev))
    }

    return yield* next(e)
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey) {
      return next(e)
    }

    const now = (await read($, forecast)) ?? (await current($))

    const { Box, Text } = $.ui.resolve(e)
    const sky = tierFor(SKIES, now.percent)

    const row = (label: unknown, value: string, note: string) => (
      <Text>
        {label}
        <Text color={BAR_COLOR}>{value === '' ? bar(0) : bar(parseFloat(value))}</Text>
        <Text> {value.padEnd(VALUE_CELLS)}</Text>
        <Text dimColor>{note}</Text>
      </Text>
    )

    const limitRow = (label: string, limit: Limit | null, withDay: boolean, tiers: typeof SKIES) => {
      if (limit === null) {
        return row(<Text dimColor>{label.padEnd(LABEL_CELLS)}</Text>, '', 'no reading')
      }

      const tier = tierFor(tiers, Math.round(limit.percent))
      const name = (
        <Text color={tier.color} bold>
          {titled(tier.icon, tier.word)}
        </Text>
      )

      const resets = limit.resetsAt
        ? `resets ${withDay ? `${DAYS[new Date(limit.resetsAt).getDay()]} ` : ''}${clock(limit.resetsAt)}`
        : ''

      return row(name, `${Math.round(limit.percent)}%`, resets)
    }

    const used = `${compact(now.tokens)} / ${compact(now.window)}`
    const turn = now.delta === null ? '' : `${now.delta < 0 ? '▼ ' : '▲ +'}${compact(now.delta)} last turn`

    return (
      <Box flexDirection="column">
        <Text>
          <Text color={sky.color} bold>
            {titled(sky.icon, sky.word)}
          </Text>
          <Text color={BAR_COLOR}>{bar(now.percent)}</Text>
          <Text> {used.padEnd(VALUE_CELLS)}</Text>
          <Text dimColor>{turn}</Text>
          <Text color={BAR_COLOR}>
            {turn === '' ? '' : '  '}
            {now.model}
            {now.effort ? ` · ${now.effort}` : ''}
          </Text>
        </Text>
        {limitRow('Session', now.session, false, SUNS)}
        {limitRow('Week', now.week, true, SEASONS)}
      </Box>
    )
  })
}
