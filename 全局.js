import plugin from '../../lib/plugins/plugin.js'
import chokidar from 'chokidar'
import sizeOf from 'image-size'
import { segment } from 'oicq'
import path from 'node:path'
import fs from 'node:fs'

/**
 * @author 戏天
 * @origin 云崽V2全局表情魔改
 * @name 全局表情
 * @time 2023/1/16 22:34封装
 * @使用须知
 * 全局文件夹Yunzai-Bot/resources/global/
 * 全局文件扔进global文件夹，按照后缀名自动识别
 * 支持图片，语音，视频
 * 【文件名】就是触发指令，多个命令可以用-隔开
 * 图片支持格式（jpg,jpeg,png,gif,bmp）
 * 语音支持格式（amr,silk,slk,mp3）
 * 视频支持格式（mp4,avi）
 * 有一定js基础可以在下方支持格式自行添加(前提是ffmpeg支持的格式)
 */
const rules = {
  /**OICQ {segment}类型 */
  image: /.(jpg|jpeg|png|gif|bmp)$/,
  record: /.(amr|silk|slk|mp3)$/,
  video: /.(mp4|avi)$/,
  json: /.json$/
}

//全局文件夹(可以自行修改)
const dir = './resources/global/'

//表情存储map
const fileArr = new Map()

export class global extends plugin {
  constructor() {
    super({
      name: '全局列表',
      dsc: '全局图片语音视频',
      /** https://oicqjs.github.io/oicq/#events */
      event: 'message',
      priority: 80000,
      rule: [
        {
          reg: '.+',
          fnc: 'global',
          log: false
        }
      ]
    })
  }

  async init() {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    global.watcher = chokidar.watch(dir, {
      ignorePermissionErrors: true,
      cwd: '.'
    }).on('add', (file) => {
      const { name, ext } = path.parse(file)
      if (Object.values(rules).some(reg => reg.test(ext))) {
        for (const key of name.split('-').map(k => k.trim())) {
          const tmp = fileArr.get(key) ?? new Set()
          tmp.add(file)
          fileArr.set(key, tmp)
        }
      }
    }).on('unlink', (file) => {
      const { name, ext } = path.parse(file)
      if (Object.values(rules).some(reg => reg.test(ext))) {
        for (const key of name.split('-').map(k => k.trim())) {
          const tmp = fileArr.get(key) ?? new Set()
          tmp.delete(file)
          fileArr[tmp.size ? 'set' : 'delete'](key, tmp)
        }
      }
    })
  }

  async [Symbol.asyncDispose]() {
    await global.watcher?.close()
    fileArr.clear()
  }

  async global(e) {
    if (!e.msg || e.hasReply) return false

    const msg = e.msg.replace(/#|＃|\./g, '');
    const files = fileArr.get(msg)
    if (!files) return false

    let file = Array.from(files)[Math.floor(Math.random() * files.size)]

    for (const [seg, reg] of Object.entries(rules)) {
      if (reg.test(file)) {
        logger.mark('全局元素: ' + msg);
        if (seg === 'json') file = JSON.parse(await fs.promises.readFile(file, 'utf8'))
        const message = segment[seg](file)
        //表情特殊处理
        if (seg === 'image') {
          const { width, height } = sizeOf(await fs.promises.readFile(file))
          const aspectRatio = width / height
          if (height > 150 && ((aspectRatio > 0.6 && aspectRatio < 1.4) || aspectRatio > 2.5)) {
            message.asface = true
          }
        }
        e.reply(message)
        break
      }
    }
    return true
  }
}
