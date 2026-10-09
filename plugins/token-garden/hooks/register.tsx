import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register, SessionContextUsage, SessionRateLimit } from 'claude-code'

import type { Forecast, Limit } from '../types'

const forecast = atom({ plugin: 'token-garden', key: 'forecast' } as const, null)

const BAR_CELLS = 20
const BAR_COLOR = '#FF8C00'
// '↯ Compact soon' is the widest label, '999.9k / 999.9k' the widest value.
const LABEL_CELLS = 15
const VALUE_CELLS = 16

const SKIES = [
  { from: 90, icon: '↯', word: 'Compact soon', color: 'red' },
  { from: 75, icon: '☇', word: 'Storm', color: 'magenta' },
  { from: 50, icon: '☂', word: 'Showers', color: 'blue' },
  { from: 25, icon: '☁', word: 'Cloudy', color: 'cyan' },
  { from: 0, icon: '☀', word: 'Clear', color: 'yellow' },
]

const skyFor = (percent: number) => SKIES.find(sky => percent >= sky.from) ?? SKIES[SKIES.length - 1]

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

const measure = async (
  $: EngineInterface,
  context: SessionContextUsage,
  limits: readonly SessionRateLimit[],
  isTurn: boolean,
) => {
  await update($, forecast, (prev: Forecast | null): Forecast | null => {
    const tokens = context.tokens ?? prev?.tokens

    if (tokens === undefined) {
      return prev
    }

    const moved = prev && isTurn ? tokens - prev.tokens : null

    return {
      tokens,
      window: context.window,
      percent: context.percent ?? Math.round((tokens / context.window) * 100),
      delta: moved === null || moved === 0 ? (prev?.delta ?? null) : moved,
      session: limitOf(limits, 'five_hour') ?? prev?.session ?? null,
      week: limitOf(limits, 'seven_day') ?? prev?.week ?? null,
    }
  })
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const usage = await $.session.usage()
    await measure($, usage.context, usage.rateLimits, false)

    return next(e)
  })

  on('session.measure', async ($, e, next) => {
    await measure($, e.context, e.rateLimits, e.changed.includes('context'))

    return next(e)
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const now = await read($, forecast)

    if (e.props.hasSurvey || now === null) {
      return next(e)
    }

    const { Box, Text } = $.ui.resolve(e)
    const sky = skyFor(now.percent)

    const row = (label: unknown, value: string, note: string) => (
      <Text>
        {label}
        <Text color={BAR_COLOR}>{value === '' ? bar(0) : bar(parseFloat(value))}</Text>
        <Text> {value.padEnd(VALUE_CELLS)}</Text>
        <Text dimColor>{note}</Text>
      </Text>
    )

    const limitRow = (label: string, limit: Limit | null, withDay: boolean) => {
      const name = <Text dimColor>{label.padEnd(LABEL_CELLS)}</Text>

      if (limit === null) {
        return row(name, '', 'no reading')
      }

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
            {`${sky.icon} ${sky.word}`.padEnd(LABEL_CELLS)}
          </Text>
          <Text color={BAR_COLOR}>{bar(now.percent)}</Text>
          <Text> {used.padEnd(VALUE_CELLS)}</Text>
          <Text dimColor>{turn}</Text>
        </Text>
        {limitRow('Session', now.session, false)}
        {limitRow('Week', now.week, true)}
      </Box>
    )
  })
}
