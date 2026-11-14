import './assets/world-bundle.js'
import { bus } from './core/bus.js'
import { State } from './core/state.js'
import { Game } from './world/player.js'
import { World } from './world/world.js'
import * as WorldAPI from './world/api.js'
import * as Characters from './assets/characters/index.js'
import * as Audio from './audio/index.js'
import * as Gameplay from './gameplay/index.js'
import * as UI from './ui/index.js'

const hud = document.getElementById('hud')
const err = (where, e) => { console.error(where, e); (window.__stats ||= { errors: [] }).errors.push(`${where}: ${e && e.stack || e}`) }
// Mỗi khối khởi động riêng: một khối hỏng không làm sập cả game.
const safe = (name, fn) => { try { fn() } catch (e) { err('init ' + name, e) } }
;(async () => {
  try {
    safe('characters', () => Characters.init()); safe('audio', () => Audio.init()); safe('gameplay', () => Gameplay.init()); safe('ui', () => UI.init())
    await World.load(); World.generate()
    World.start(document.getElementById('c'), hud)
    safe('worldAPI', () => WorldAPI.init())
    bus.emit('world:ready')
  } catch (e) { hud.textContent = 'lỗi: ' + (e.stack || e); err('main', e) }
})()
