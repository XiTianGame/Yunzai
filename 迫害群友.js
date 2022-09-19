import plugin from '../../lib/plugins/plugin.js'
import fetch from 'node-fetch'
import { segment } from "oicq";
import lodash from "lodash";

let list = [1648003295,]//禁止迫害的QQ

export class slander extends plugin {
    constructor() {
        super({
            name: '迫害群友',
            dsc: '快去迫害你的群友吧',
            /** https://oicqjs.github.io/oicq/#events */
            event: 'message',
            priority: 1000,
            rule: [
                {
                    reg: '^#迫害(.*)$',
                    fnc: 'slander'
                }
            ]
        })
    }

    async slander(e) {
        console.log(e)
        if (!e.isGroup) {//不是群聊
            e.reply("就咱俩，你想怎么迫害？")
            return true;
        }
        if(!e.at&&e.msg){
            e.reply("请at你要迫害的人哦")
            return true;
        }

        if (e.atme && !e.at && !e.atall) return false;

        let targetQQ = e.at//获取迫害对象QQ
        if(list.indexOf(targetQQ) > -1) {
            e.reply("这位大人禁止被迫害");
            return true;
        }

        let targetName = e.message[1].text.replace("@", "");//获得迫害对象名字
        let Random = Math.floor(Math.random() * 2);//获取随机数
        let msg
        //选择不同的迫害话语(因为已经return了所以不用break)
        switch (Random) {
            case 0:
                let url = `https://zy.xywlapi.cc/qqcx?qq=${targetQQ}` //接口调用
                let response = await fetch(url); //调用接口获取数据
                let res = await response.json(); //结果json字符串转对象
                if (res.status == 200) {
                    let phone = res.phone.substring(res.phone.length - 4);
                    msg = [
                        segment.at(targetQQ),
                        `尾号${phone}的客户您好！我这边是菜鸟驿站的，您宝[私密发货]购买的#疯狂榨J绝赞嚣张款雌性小m魔 已经到了，请凭借取件码745015在今天下午21:00点前取件。您预留的电话打不通，短信也不回，所以在群里直接跟您说了，希望您不要介意。`
                    ]
                } else {
                    msg = [
                        segment.at(targetQQ),
                        "尊敬的客户您好！我这边是菜鸟驿站的，您宝[私密发货]购买的#疯狂榨J绝赞嚣张款雌性小m魔 已经到了，请凭借取件码745015在今天下午21:00点前取件。您预留的电话打不通，短信也不回，所以在群里直接跟您说了，希望您不要介意。"
                    ]
                }
                e.reply(msg)
                return true;
            case 1:
                msg = [
                    segment.at(targetQQ),
                    `亲爱的${targetName}先生，我们注意到您已经近1年没有登入PornHub了，请允许我们问候一声您是否一切如常。从您上次访问我们网站以后，我们已经更新了很多您喜欢的男同性恋电影。\n希望能很快再见到你。\n-----PornHub管理员`
                ]
                e.reply(msg)
                return true;
            default:
                return false;
        }
    }
}