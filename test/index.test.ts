import type { IDeepLData, IDeepLOneShotData, IOptions } from '../src/types'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DEEPL_URL, getBody, parse2DeepLX, translate } from '../src'

function createOptions(overrides: Partial<IOptions> = {}): IOptions {
  return { from: 'EN', to: 'ZH', text: 'Hello, world!', ...overrides }
}

describe('getBody', () => {
  it('builds an oneshot request body', () => {
    expect(JSON.parse(getBody(createOptions()))).toEqual({
      text: ['Hello, world!'],
      target_lang: 'zh-Hans',
      source_lang: 'en',
      usage_type: 'translate',
    })
  })

  it('omits source_lang when the source is AUTO', () => {
    const body = JSON.parse(getBody(createOptions({ from: 'AUTO' })))
    expect(body).not.toHaveProperty('source_lang')
  })

  it('maps target language codes', () => {
    expect(JSON.parse(getBody(createOptions({ to: 'EN' }))).target_lang).toBe('en-US')
    expect(JSON.parse(getBody(createOptions({ to: 'PT' }))).target_lang).toBe('pt-BR')
    expect(JSON.parse(getBody(createOptions({ to: 'ZH' }))).target_lang).toBe('zh-Hans')
  })

  it('maps source language codes', () => {
    expect(JSON.parse(getBody(createOptions({ from: 'EN' }))).source_lang).toBe('en')
    expect(JSON.parse(getBody(createOptions({ from: 'ZH' }))).source_lang).toBe('zh')
  })
})

describe('translate', () => {
  const mockFetch = vi.fn()

  beforeEach(() => {
    globalThis.fetch = mockFetch as any
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  it('posts to the oneshot endpoint', async () => {
    mockFetch.mockResolvedValueOnce(new Response('{}', { status: 200 }))

    await translate(createOptions())

    expect(DEEPL_URL).toBe('https://oneshot-free.www.deepl.com/v1/translate')
    expect(mockFetch).toHaveBeenCalledWith(DEEPL_URL, {
      method: 'POST',
      body: getBody(createOptions()),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'None',
      },
    })
  })

  it('allows text at the 1500 character limit', async () => {
    mockFetch.mockResolvedValueOnce(new Response('{}', { status: 200 }))

    await translate(createOptions({ text: 'a'.repeat(1500) }))

    expect(mockFetch).toHaveBeenCalledOnce()
  })

  it('rejects text above 1500 characters without calling upstream', async () => {
    const response = await translate(createOptions({ text: 'a'.repeat(1501) }))

    expect(response.status).toBe(413)
    await expect(response.json()).resolves.toEqual({
      code: 413,
      message: expect.stringContaining('text exceeds maximum length'),
    })
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('passes through an upstream 429 response', async () => {
    const blocked = new Response(null, { status: 429 })
    mockFetch.mockResolvedValueOnce(blocked)

    const response = await translate(createOptions())

    expect(response).toBe(blocked)
  })
})

describe('parse2DeepLX', () => {
  it('converts an oneshot response into the DLX shape', () => {
    const input: IOptions & IDeepLOneShotData = {
      ...createOptions(),
      translations: [
        {
          detected_source_language: 'en',
          text: '你好，世界！',
          is_language_detection_confident: true,
        },
      ],
    }

    const output = parse2DeepLX(input)

    expect(output).toMatchObject({
      code: 200,
      method: 'Free',
      source_lang: 'EN',
      target_lang: 'ZH',
      data: '你好，世界！',
      alternatives: null,
    })
    expect(output).not.toHaveProperty('from')
    expect(output).not.toHaveProperty('to')
    expect(typeof output.id).toBe('number')
  })

  it('normalizes regional detected languages', () => {
    const input: IOptions & IDeepLOneShotData = {
      ...createOptions(),
      translations: [
        {
          detected_source_language: 'zh-Hans',
          text: '你好',
          is_language_detection_confident: false,
        },
      ],
    }

    expect(parse2DeepLX(input).source_lang).toBe('ZH')
  })

  it('converts a legacy JSON-RPC response into the same DLX shape', () => {
    const input: IOptions & IDeepLData = {
      ...createOptions(),
      jsonrpc: '2.0',
      id: 123456,
      result: {
        texts: [{ text: '你好', alternatives: [{ text: '您好' }] }],
        lang: 'EN',
        lang_is_confident: true,
        detectedLanguages: {},
      },
    }

    expect(parse2DeepLX(input)).toEqual({
      code: 200,
      id: 123456,
      method: 'Free',
      source_lang: 'EN',
      target_lang: 'ZH',
      data: '你好',
      alternatives: null,
    })
  })

  it('throws when the translation text is missing', () => {
    const input = { ...createOptions(), translations: [] } as IOptions & IDeepLOneShotData

    expect(() => parse2DeepLX(input)).toThrow(/missing translation/i)
  })
})
