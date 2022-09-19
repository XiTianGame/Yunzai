import plugin from '../../lib/plugins/plugin.js'
import cfg from '../../lib/config/config.js'

/*
只让机器人响应这些指令，其他指令不响应，相当于加强版禁用指令
防止机器人混进群被发现(bushi)
如果有安装消息监听，色图监听等插件，请自行设置机器人不警告，否则会露馅
*/
//是否开启隐身
let enable = true
//响应指令:(填空就什么都不响应)
let key = ["#重启",]
//应用的群聊
let group = [12345,213938015]
//指令禁用应用于私聊
let private_chat = true;
//对主人是否生效(true生效，false不生效)
let master = false

export class stealth extends plugin {
    constructor() {
        super({
            name: '隐身模式',
            dsc: '让你的机器人在群里隐身',
            /** https://oicqjs.github.io/oicq/#events */
            event: 'message',
            priority: 1,
            rule: [
                {
                    reg: '(.*)',
                    fnc: 'stealth',
                    log: false
                },
            ]
        })
    }

    async stealth(e){
        //开没开启隐身？
        if(!enable){
            return false;
        }
        //响应主人
        if(e.isMaster&&!master){
            return false;
        }
        //响应放行指令
        if(key.find(item=>e.msg.includes(item))){
            return false;
        }
        //私聊禁用
        if(e.isPrivate&&private_chat){
            console.log(`来自${e.user_id}的私聊消息，已拦截`)
            return true;
        }
        //包含群号直接拦截
        if(e.isGroup&&group.indexOf(e.group_id)>-1){
            console.log(`来自群${e.group_id}的群聊消息，已拦截`)
            return true;
        }

        return false;
    }
}