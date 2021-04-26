import {nanoid} from 'nanoid'


export default class Client {
  ws
  #id
  #encoder

  constructor(encoder) {
    this.#id = nanoid()
    this.#encoder = encoder
  }

  get id() {
    return this.#id
  }

  get encoder() {
    return this.#encoder
  }

  emit(event, ...args) {
    this.ws.emit(this.#id, event, ...args)
  }
}
