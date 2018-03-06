/**
 * React Native Map Link
 *
 * This file supports both iOS and Android.
 */

import { Platform, Alert, ActionSheetIOS, Linking } from 'react-native'

class MapsException {
  constructor (message) {
    this.message = message
    this.name = 'MapsException'
  }
}

const isIOS = Platform.OS === 'ios'

const apps = [
  'apple-maps',
  'google-maps',
  'citymapper',
  'uber',
  'lyft',
  'navigon',
  'transit',
  'waze',
  'yandex',
  'moovit'
]

const prefixes = {
  'apple-maps': isIOS ? 'http://maps.apple.com/' : 'applemaps://',
  'google-maps': isIOS ? 'comgooglemaps://' : 'https://maps.google.com/',
  'citymapper': 'citymapper://',
  'uber': 'uber://',
  'lyft': 'lyft://',
  'navigon': 'navigon://',
  'transit': 'transit://',
  'waze': 'waze://',
  'yandex': 'yandexnavi://',
  'moovit': 'moovit://'
}

const titles = {
  'apple-maps': 'Apple Maps',
  'google-maps': 'Google Maps',
  'citymapper': 'Citymapper',
  'uber': 'Uber',
  'lyft': 'Lyft',
  'navigon': 'Navigon',
  'transit': 'The Transit App',
  'waze': 'Waze',
  'yandex': 'Yandex.Navi',
  'moovit': 'Moovit'
}

/**
 * Check if a given map app is installed.
 *
 * @param {string} app
 * @returns {Promise<boolean>}
 */
export function isAppInstalled (app) {
  return new Promise((resolve) => {
    if (!(app in prefixes)) {
      return resolve(false)
    }

    Linking.canOpenURL(prefixes[app])
      .then((result) => {
        resolve(!!result)
      })
      .catch(() => resolve(false))
  })
}

/**
 * Ask the user to choose one of the available map apps.
 * @param title
 * @param message
 * @returns {Promise<any>}
 */
export function askAppChoice (title = 'Open in Maps', message = 'What app would you like to use?') {
  return new Promise(async (resolve) => {
    let availableApps = []
    for (let app in prefixes) {
      let avail = await isAppInstalled(app)
      if (avail) {
        availableApps.push(app)
      }
    }
    if (availableApps.length < 2) {
      return resolve(availableApps[0] || null)
    }

    if (isIOS) {
      let options = availableApps.map((app) => titles[app])
      options.push('Cancel')

      ActionSheetIOS.showActionSheetWithOptions({
        title: title,
        message: message,
        options: options,
        cancelButtonIndex: options.length - 1
      }, (buttonIndex) => {
        if (buttonIndex === options.length - 1) {
          return resolve(null)
        }
        return resolve(availableApps[buttonIndex])
      })

      return
    }

    let options = availableApps.map((app) => ({text: titles[app], onPress: () => resolve(app)}))
    options.push({text: 'Cancel', onPress: () => resolve(null), style: 'cancel'})
    Alert.alert(title, message, options, {onDismiss: () => resolve(null)})
  })
}

/**
 * Open a maps app, or let the user choose what app to open, with the given location.
 *
 * @param {{
 *     latitude: number | string,
 *     longitude: number | string,
 *     title: string | undefined | null,
 *     app: string | undefined | null
 * }} options
 */
export async function showLocation (options) {
  if (!options || typeof options !== 'object') {
    throw new MapsException('First parameter of `showLocation` should contain object with options.')
  }
  if (!('latitude' in options) || !('longitude' in options)) {
    throw new MapsException('First parameter of `showLocation` should contain object with at least keys `latitude` and `longitude`.')
  }
  if ('address' in options && options.address && typeof options.address !== 'string') {
    throw new MapsException('Option `address` should be of type `string`.')
  }
  if ('title' in options && options.title && typeof options.title !== 'string') {
    throw new MapsException('Option `title` should be of type `string`.')
  }
  if ('app' in options && options.app && apps.indexOf(options.app) < 0) {
    throw new MapsException('Option `app` should be undefined, null, or one of the following: "' + apps.join('", "') + '".')
  }

  let lat = parseFloat(options.latitude)
  let lng = parseFloat(options.longitude)
  let address = options.address && options.address.length ? options.address : null
  let title = options.title && options.title.length ? options.title : null
  let app = options.app && options.app.length ? options.app : null

  if (!app) {
    app = await askAppChoice()
  }

  let url = null
  switch (app) {
    case 'apple-maps':
      url = prefixes['apple-maps'] + '?ll=' + lat + ',' + lng +
        '&q=' + encodeURIComponent(title || 'Location') +
        '&address=' + encodeURIComponent(address || '')
      break
    case 'google-maps':
      url = prefixes['google-maps'] + (isIOS
        ? '?api=1&ll=' + lat + ',' + lng + '&q=' + encodeURIComponent(address || title || 'Location')
        : '?q=' + lat + ',' + lng)
      break
    case 'citymapper':
      url = prefixes['citymapper'] + 'directions?endcoord=' + lat + ',' + lng
      if (title) {
        url += '&endname=' + encodeURIComponent(title)
      }
      break
    case 'uber':
      url = prefixes['uber'] + '?action=setPickup&pickup=my_location&dropoff[latitude]=' + lat +
        '&dropoff[longitude]' + lng
      if (title) {
        url += '&dropoff[nickname]=' + encodeURIComponent(title)
      }
      break
    case 'lyft':
      url = prefixes['lyft'] + 'ridetype?id=lyft&destination[latitude]=' + lat +
        '&destination[longitude]=' + lng
      break
    case 'transit':
      url = prefixes['transit'] + 'directions?to=' + lat + ',' + lng
      break
    case 'waze':
      url = prefixes['waze'] + '?ll=' + lat + ',' + lng + '&navigate=yes'
      break
    case 'yandex':
      url = prefixes['yandex'] + 'build_route_on_map?lat_to=' + lat + '&lon_to=' + lng
      break
    case 'moovit':
      url = prefixes['moovit'] + 'directions?dest_lat=' + lat + '&dest_lon' + lng
      if (title) {
        url += '&dest_name=' + encodeURIComponent(title)
      }
      break
  }

  if (url) {
    return Linking.openURL(url)
  }
}
