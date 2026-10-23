import { expect, mock, test } from 'claude-code/testing'

const BAND = { plugin: 'token-garden', component: 'AbovePrompt', props: { hasSurvey: false, isWorking: false, maxRows: 10, bodyColumns: 100, scroll: { offset: 0, bodyRows: 10 }, view: {} } } as const

test('/garden hides the band and brings it back', async ($, on) => {
  // Each hook here stands for the engine beneath the plugin.
  mock.clock(on)
  mock.store(on)
  on('command.register', () => ({ value: { command: 'garden' } }))
  on('session.usage', () => ({ value: { startedAt: 0, context: { tokens: 50_000, window: 200_000, percent: 25 }, rateLimits: [] } }))
  on('session.model', () => ({ value: 'claude-opus-5-5' }))
  on('settings.read', () => ({ value: {} as never }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('ui.render', ($, e) => {
    const { Text } = $.ui.resolve(e)
    return <Text>engine band</Text>
  })

  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })

  const shown = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect(await shown.find({ type: 'Text', text: /opus/ })).toBeTruthy()
  await shown.unmount()

  expect((await $.command.run({ command: 'garden', args: '' } as never)).text).toMatch(/hidden/)
  const hiddenBand = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect(await hiddenBand.find({ type: 'Text', text: /opus/ })).toBeFalsy()
  await hiddenBand.unmount()

  expect((await $.command.run({ command: 'garden', args: 'show' } as never)).text).toMatch(/shown/)
  const back = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect(await back.find({ type: 'Text', text: /opus/ })).toBeTruthy()
  await back.unmount()
})

test('the switch row runs /roster and puts the garden away', async ($, on) => {
  mock.clock(on)
  mock.store(on)
  const ran: string[] = []
  on('command.register', (_, e) => ({ value: { command: e.name } }))
  on('command.run', (_, e) => {
    ran.push(e.command)
    return { text: '' }
  })
  on('session.usage', () => ({ value: { startedAt: 0, context: { tokens: 50_000, window: 200_000, percent: 25 }, rateLimits: [] } }))
  on('session.model', () => ({ value: 'claude-opus-5-5' }))
  on('settings.read', () => ({ value: {} as never }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('ui.render', ($, e) => {
    const { Text } = $.ui.resolve(e)
    return <Text>engine band</Text>
  })

  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })

  for (const surface of ['terminal', 'desktop'] as const) {
    const band = await $.ui.mount({ ...BAND, surface })
    await band.press({ key: 'agents' })
    expect(ran).toContain('roster')
    ran.length = 0

    await band.press({ key: 'garden' })
    await band.unmount()
    const away = await $.ui.mount({ ...BAND, surface })
    expect(await away.find({ type: 'Text', text: /opus/ })).toBeFalsy()
    expect(await away.find({ key: 'garden' })).toBeTruthy()
    await away.press({ key: 'garden' })
    await away.unmount()
  }
})
