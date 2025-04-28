import plugin from '../../lib/plugins/plugin.js'
import loader from '../../lib/plugins/loader.js'
import lodash from 'lodash'

/**多指令标识符 */
const marking = '#'

const symbol = Symbol('multi')

export class multi extends plugin {
  constructor() {
    super({
      name: '多指令执行',
      dsc: '允许多个指令合并到一条消息',
      /** https://oicqjs.github.io/oicq/#events */
      event: 'message',
      priority: -Infinity,
      rule: [
        {
          reg: '[\\S\\s]*',
          fnc: 'identify',
          log: false
        }
      ]
    })
  }

  async identify() {
    if(this.e[symbol]) return false
    const metchs = this.e.msg?.split(marking) ?? []
    if(metchs.length > 2) {
      if(this.e.message?.length > 1 || this.e.message[0]?.type !== 'text') return false
      for(const command of lodash.compact(metchs)) {
        //避免重定义错误
        const e = Object.create(this.e)
        e[symbol] = true
        for(const k of Object.keys(this.e)) e[k] = this.e[k]
        e.message[0].text = marking + command
        e.raw_message = marking + command
        e.original_msg = marking + command
        e.msg = ''
        delete loader.groupGlobalCD?.[e.group_id]
        delete loader.groupCD?.[e.group_id]
        delete loader.singleCD?.[`${e.group_id}.${e.user_id}`]
        logger.info('顺序执行指令:', marking + command)
        await loader.deal(e)
      }
      return true
    } else {
      return false
    }
  }
}
