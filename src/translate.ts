// https://developers.deepl.com/docs/api-reference/translate

import type { IDeepLData, IDeepLOneShotData, IDeepLXData, IOptions, TSourceLanguage } from './types'

export const DEEPL_URL = 'https://oneshot-free.www.deepl.com/v1/translate'
export const MAX_TEXT_LENGTH = 1500

const TARGET_LANG_MAP: Record<string, string> = {
  'EN': 'en-US',
  'PT': 'pt-BR',
  'ZH': 'zh-Hans',
  'ZH-HANS': 'zh-Hans',
  'ZH-HANT': 'zh-Hant',
}

const SOURCE_LANG_MAP: Record<string, string> = {
  'EN': 'en',
  'PT': 'pt',
  'ZH': 'zh',
  'ZH-HANS': 'zh',
  'ZH-HANT': 'zh',
}

function toTargetLang(lang: string): string {
  return TARGET_LANG_MAP[lang] ?? lang.toLowerCase()
}

function toSourceLang(lang: string): string | undefined {
  if (lang === 'AUTO') {
    return undefined
  }
  return SOURCE_LANG_MAP[lang] ?? lang.toLowerCase()
}

function normalizeDetectedLang(lang: string): TSourceLanguage {
  return lang.split('-')[0].toUpperCase() as TSourceLanguage
}

export async function translate(options: IOptions): Promise<Response> {
  if (options.text.length > MAX_TEXT_LENGTH) {
    return new Response(JSON.stringify({
      code: 413,
      message: `text exceeds maximum length: ${options.text.length} characters (anonymous oneshot limit is ${MAX_TEXT_LENGTH})`,
    }), {
      status: 413,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  return fetch(DEEPL_URL, {
    method: 'POST',
    body: getBody(options),
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'None',
    },
  })
}

type TDeepLResponse = IOptions & (IDeepLData | IDeepLOneShotData)

export function parse2DeepLX(data: TDeepLResponse): IDeepLXData {
  if ('translations' in data) {
    const translation = data.translations[0]
    if (!translation?.text) {
      throw new Error('Unexpected DeepL response: missing translation text')
    }

    return {
      code: 200,
      id: Date.now(),
      method: 'Free',
      source_lang: normalizeDetectedLang(translation.detected_source_language),
      target_lang: data.to,
      data: translation.text,
      alternatives: null,
    }
  }

  const text = data.result.texts[0]?.text
  if (!text) {
    throw new Error('Unexpected DeepL response: missing translation text')
  }

  return {
    code: 200,
    id: data.id,
    method: 'Free',
    source_lang: data.result.lang,
    target_lang: data.to,
    data: text,
    alternatives: null,
  }
}

export function getBody({ from, to, text }: IOptions): string {
  const sourceLang = toSourceLang(from)

  return JSON.stringify({
    text: [text],
    target_lang: toTargetLang(to),
    ...(sourceLang ? { source_lang: sourceLang } : {}),
    usage_type: 'translate',
  })
}
