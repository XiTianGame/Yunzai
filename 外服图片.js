import plugin from '../../lib/plugins/plugin.js'
import { segment } from "oicq";
import fetch from "node-fetch";

/**********************自定义设置**********************/
let timeout = 20000; //撤回CD单位毫秒
let r18 = true;//意思如其名
let withdraw = true;//是否撤回

const conversion = {
    '零': '0',
    '一': '1',
    '二': '2',
    '三': '3',
    '四': '4',
    '五': '5',
    '六': '6',
    '七': '7',
    '八': '8',
    '九': '9',
    '十': '10',
};
// 该 api 文档：https://waifu.im/docs/
export class waifu extends plugin {
    constructor() {
        super({
            name: '外服',
            dsc: '来自外服API的精致图片',
            /** https://oicqjs.github.io/oicq/#events */
            event: 'message',
            priority: 5000,
            rule: [
                {
                    reg: '^#随机(.*)$',
                    fnc: 'waifu'
                }
            ]
        })
    }

    async waifu(e) {
        let tags = e.msg.replace(/#随机|涩|色|图/g, "");
        let url, num = 1;
        if (tags.includes("连")) {
            tags = tags.replace("连", "").split("").map(v => conversion[v] || v);
            num = tags.pop();
            tags = tags.join("");
        }
        switch (tags) {
            case "制服":
                url = `https://api.waifu.im/random/?selected_tags=uniform`;
                break;
            case "女仆":
                url = `https://api.waifu.im/random/?selected_tags=maid`;
                break;
            case "喜多川":
            case "海梦":
            case "喜多川海梦":
                url = `https://api.waifu.im/random/?selected_tags=marin-kitagawa`;
                break;
            case "林美声":
                url = `https://api.waifu.im/random/?selected_tags=mori-calliope`;
                break;
            case "雷电":
            case "雷电将军":
                url = `https://api.waifu.im/random/?selected_tags=raiden-shogun`;
                break;
            case "欧派":
                url = `https://api.waifu.im/random/?selected_tags=oppai`;
                break;
            case "自拍":
                url = `https://api.waifu.im/random/?selected_tags=selfies`;
                break;
            default:
                return false;
        }
        if (num > 1) {
            url = `${url}&is_nsfw=${r18}&many=true`;
        } else {
            url = `${url}&is_nsfw=${r18}`;
        }
        const response = await fetch(url); //调用接口获取数据
        let res = await response.json(); //结果json字符串转对象
        for (let tmp = 0; tmp < parseInt(num); tmp++) {
            let imgurl = res.images[tmp].url;
            let msg = [
                segment.image(imgurl)
            ]
            if (withdraw == true) {
                let msgRes = await e.reply(msg);
                this.chehui(msgRes, e, imgurl);
            }
            else {
                await e.reply(msg);
            }
        }

        return true;
    }

    async chehui(msgRes, e, imgurl) {
        let msg = [
            segment.at(e.user_id),
            "\n",
            imgurl,
        ];
        if (timeout != 0 && msgRes && msgRes.message_id) {
            let target = null;
            if (e.isGroup) {
                target = e.group;
            } else {
                target = e.friend;
            }
            if (target != null) {
                setTimeout(() => {
                    target.recallMsg(msgRes.message_id);
                    e.reply(msg);
                }, timeout);
            }
        }
    }
}