const { GLib } = imports.gi

const _MS_PER_MINUTE = 1000 * 60;
const _MS_PER_HOUR = 1000 * 60 * 60;
const _MS_PER_DAY = 1000 * 60 * 60 * 24;

let CACHE = {}
const CACHE_TIME = 10 * 1000

var isNullOrUndefined = value => typeof value === 'undefined' || value === null
var isNullOrEmpty = value => isNullOrUndefined(value) || value.length === 0
var fallbackIfNaN = (value, fallback = '--') => typeof value === 'undefined' || value === null || isNaN(value) ? fallback : value

var closest = (array, target) => array.reduce((prev, curr) => Math.abs(curr - target) < Math.abs(prev - target) ? curr : prev)

var decodeBase64JsonOrDefault = (encodedJson, defaultValue) => {
  try {
    const value = JSON.parse(GLib.base64_decode(encodedJson))

    if (!value) {
      return defaultValue
    }

    return value
  } catch (e) {
    log(`failed to decode base64 json ${e}`)
    return defaultValue
  }
}

var tryJsonParse = (rawJson, defaultValue) => {
  try {
    const value = JSON.parse(rawJson)

    if (!value) {
      return defaultValue
    }

    return value
  } catch (e) {
    log(`failed to parse json ${e}`)
    return defaultValue
  }
}

var clearCache = () => {
  CACHE = {}
}

var cacheOrDefault = async (cacheKey, evaluator, cacheDuration = CACHE_TIME) => {
  const [timestamp, data] = CACHE[cacheKey] || []

  if (timestamp && data && timestamp + cacheDuration >= Date.now()) {
    return data
  }

  const freshData = await evaluator()

  CACHE[cacheKey] = [Date.now(), freshData]

  return freshData
}

var roundOrDefault = (number, defaultValue = '--') => isNullOrUndefined(number) ? defaultValue : (Math.round((number + Number.EPSILON) * 100) / 100).toFixed(2)

var isoToDate = input => {
  if (!input) {
    return
  }

  const a = Date.parse(input.slice(0, 4) + '-' + input.slice(4, 6) + '-' + input.slice(6, 11) + ':' +
      input.slice(11, 13) + ':' + input.slice(13, 16))

  return isNaN(a) ? null : new Date(a)
}

var getBestTimeAbbreviation = (a, b) => {
  if (!a || !b) {
    return
  }

  // Discard the time and time-zone information.
  let diffTime = b - a
  let result = ''

  let minutes = Math.floor(diffTime / _MS_PER_MINUTE)
  let hours = Math.floor(diffTime / _MS_PER_HOUR)

  if (minutes < 0) {
    result = undefined
  } else if (minutes <= 60) {
    result = minutes + 'm'
  } else if (hours <= 24) {
    result = hours + 'h'
  } else {
    let utc1 = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate())
    let utc2 = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate())
    result = Math.floor((utc2 - utc1) / _MS_PER_DAY) + 'd'
  }

  return result
}

