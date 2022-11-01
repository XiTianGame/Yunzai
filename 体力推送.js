import plugin from '../../lib/plugins/plugin.js'
import cfg from '../../lib/config/config.js'
import common from '../../lib/common/common.js'
import { segment } from 'oicq'
import gsCfg from '../genshin/model/gsCfg.js'
import MysInfo from '../genshin/model/mys/mysInfo.js'
import lodash from 'lodash'


/**大于多少体力推送 */
const noteResin = 120
/**体力推送CD,单位小时 */
const noteCD = 6
/**定时任务,cron表达式 */
const noteTime = '0 0/30 * * * ?'
/**连续推送延时,单位毫秒 */
const interval = 100
/**推送体力模板,0:自带,1:图鉴(前提已安装图鉴插件) */
const template = 0
/**推送黑名单 */
const blacklist = []
/**整合云崽黑名单 */
const usYZblack = true


if(usYZblack){
	let list = cfg.getConfig('other').blackQQ;
	list.forEach(item => {
		blacklist.push(item);
	});
}
export class Resin_push extends plugin {
    constructor() {
        super({
            name: '体力推送',
            dsc: '体力超出规定值自动提醒',
            /** https://oicqjs.github.io/oicq/#events */
            event: 'message',
            priority: 3000,
            rule: [
                {
                    reg: '^#*(开启|关闭)(体力|树脂)推送$',
                    fnc: 'TaskCtl'
                },
            ]
        })
        this.task = {
            cron: noteTime,
            name: '体力定时推送',
            fnc: () => this.noteTask()
        }
    }

    /** 输出是否推送过体力 */
    async hasPush(qq) {
        let key = `Yz:genshin:dailyNote:notePush:${qq}`
        return await redis.get(key) == 'true'
    }

    /** 体力定时推送 */
    async noteTask() {
        let cks = (await gsCfg.getBingCk()).ck
        let qqs = lodash.filter(cks, (o) => { return o.notePush === true })
        qqs = lodash.map(qqs, 'qq')
        for (const i of qqs) {
            /**关闭黑名单推送 */
            if ((blacklist).find(item => item == i)) {
                this.setPush(i, false)
                continue
            }
            /**组装虚拟消息 */
            let e = {
                user_id: i,
                message: [
                    {
                        type: 'text',
                        text: '体力'
                    }
                ],
                raw_message: '体力',
                sender: {
                    user_id: i,
                    card: i
                },
                msg: '体力',
                reply: async (msg) => await Bot.pickFriend(i).sendMsg(msg),
            }
            if (await this.hasPush(i)) continue
            /**判断树脂 */
            let resin = await MysInfo.get(e, 'dailyNote')
            if (resin.data.current_resin < noteResin) continue
            //发送消息
            await this.choose(e)

            redis.set(`Yz:genshin:dailyNote:notePush:${i}`, 'true', { EX: noteCD * 3600 })
            await common.sleep(interval)
        }
        return true
    }

    /**选择云崽或图鉴体力 */
    async choose(e) {
        switch (template) {
            case 0:
                await this.sendByYZ(e)
                break;
            case 1:
                await this.sendByTJ(e)
                break;
            default:
                break;
        }
        return true;
    }

    /**模拟云崽获取体力 */
    async sendByYZ(e) {
        const Note = new (await import('../genshin/apps/dailyNote.js')).dailyNote
        Note.e = e;
        await Note.note(e)
        return true;
    }

    /**模拟图鉴获取体力 */
    async sendByTJ(e) {
        try {
            let { getRender } = await import(`../xiaoyao-cvs-plugin/adapter/render.js`);
            let { Note } = await import('../xiaoyao-cvs-plugin/apps/Note.js')
            await Note(e, {
                render: getRender()
            });
        } catch (err) {
            logger.warn("调用图鉴失败,请确认你安装了图鉴插件")
            //重新调用云崽
            await this.sendByYZ(e)
        }
        return true;
    }

    /**体力推送控制 */
    async TaskCtl(e) {
        /**检查黑名单 */
        if ((blacklist).find(item => item == e.user_id)) return false

        let state = true
        if (e.msg.includes("关闭")) {
            state = false
        }

        const result = await this.setPush(e.user_id, state);
        if (!result) {
            await e.reply(`${state ? '开启' : '关闭'}推送失败，请先#绑定cookie\n发送【cookie帮助】查看配置教程`, false, { at: true })
            return true;
        }

        let msg = `uid:${result.uid}\n原神体力推送已${state ? '开启' : '关闭'}`
        if (state) {
            msg += '\n每天将为你自动推送体力~'
        } else {
            msg += '\n以后不会再提醒你了哦~'
        }
        await e.reply([segment.at(e.user_id), msg])
        return true
    }

    /**
     * 设置ck文件
     * @param qq 需要设置QQ
     * @param state 是否推送
     * @returns ck数据
     */
    async setPush(qq, state) {
        /** 获取个人ck */
        let ck = gsCfg.getBingCkSingle(qq)

        if (lodash.isEmpty(ck)) {
            return false
        }

        let autoCk = {}
        for (let i in ck) {
            if (!ck[i].isMain) continue
            autoCk = ck[i]
            if (state) {
                ck[i].notePush = true
            } else {
                ck[i].notePush = false
            }
        }

        if (lodash.isEmpty(autoCk)) return null;

        gsCfg.saveBingCk(qq, ck)

        return autoCk
    }
}