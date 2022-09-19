import plugin from '../../lib/plugins/plugin.js'
import fs from 'fs';
import { segment } from "oicq";
import fetch from "node-fetch";

const _path = process.cwd();//云崽目录

let interval = 5;//开团间隔，单位秒
let mode = 0;//图片模式，0是网络接口，1是本地
let path = `${_path}/resources/kunkun`//图片路径
let kunkun = [7578658303] //坤坤歌单(网易云)
var ikunyl = [
    '小黑子香精煎鱼食不食?', 
    '小黑子食不食油饼?', 
    '你干嘛~~~哎哟~~~', 
    '我家哥哥下蛋你别吃', 
    '一小黑子树脂666~', 
    '巅峰产生虚伪的拥护，\n黄昏见证真正的信徒', 
    '又黑我家哥哥?',
] //ikun语录，可以自行添加


let timer = {};

export class ikun extends plugin {
    constructor() {
        super({
            name: '开团',
            dsc: '小黑子露出鸡脚了吧？',
            /** https://oicqjs.github.io/oicq/#events */
            event: 'message',
            priority: 3000,
            rule: [
                {
                    reg: '^((.*)鸡你太美(.*)|(.*)寄你太美(.*)|(.*)小黑子(.*)|(.*)鲲鲲(.*)|(.*)鸽鸽(.*))$',
                    fnc: 'jtm'
                },
                {
                    reg: '^(.*)开团(.*)$',
                    fnc: 'kaituan'
                },
                {
                    reg: '^(.*)(别发了|住手|报警了)$',
                    fnc: 'stopkaituan'
                },
                {
                    reg: '^((.*)鸡叫(.*))$',
                    fnc: 'jijiao'
                }
            ]
        })
    }

    async jtm(e) {
        let photo;
        if (mode == 0) {
            photo = `http://25252.xyz/j` //接口调用
        } else if (mode == 1) {
            if (!fs.existsSync(path)) {
                cancel(e);
                e.reply("没有找到本地图库路径");
            }
            let list = fs.readdirSync(`${path}`);//读取全部文件
            if (list.length == 0) {
                cancel(e);
                e.reply("本地图库为空");
            }
            let name = list[parseInt(Math.random() * list.length, 10)];
            photo = `${path}/${name}`;
        } else {
            cancel(e);
            return false
        };//你填非0|1模式干哈

        let msg = segment.image(photo)//配置消息

        if (e.isGroup) {
            await Bot.pickGroup(e.group_id).sendMsg(msg);
        } else {
            await Bot.pickFriend(e.user_id).sendMsg(msg);
        }
        return true;
    }

    async stopkaituan(e) {
        cancel(e);
        e.reply('我是ikun相信我')//停止提示
        return true;
    }

    async kaituan(e) {
        let id;
        if (e.isGroup) {
            id = e.group_id;
        } else id = e.user_id;

        if (!timer[id]) {
            let sjyl = parseInt(Math.random() * (ikunyl.length), 10); //随机ikun语录
            e.reply(ikunyl[sjyl]);
            timer[id] = setInterval(() => {
                this.jtm(e);
            }, interval * 1000);
        } else {
            let msg = [
                segment.at(e.user_id),
                "小黑子露出鸡脚了吧"
            ]
            e.reply(msg);
        }

        return true;
    }

    async jijiao(e) {
        let jijiao = await (await fetch(`https://api.yimian.xyz/msc/?type=playlist&id=${kunkun}&random=true`)).json(); //歌曲接口调用

        console.log('随机鸡叫,歌名为:' + jijiao[0].name);

        let sjyl = parseInt(Math.random() * (ikunyl.length), 10); //随机ikun语录

        e.reply(ikunyl[sjyl]);
        e.reply(segment.record(jijiao[0].url)); //随机鸡叫

        return true; //返回true 阻挡消息不再往下
    }
}

function cancel(e){
    if (e.isGroup) {
        if (timer[e.group_id]) {
            clearInterval(timer[e.group_id]);
            delete timer[e.group_id];
        }
    } else {
        if (timer[e.user_id]) {
            clearInterval(timer[e.user_id]);
            delete timer[e.user_id];
        }
    }
}
