import plugin from '../../lib/plugins/plugin.js'
import fetch from 'node-fetch'
import { segment } from 'oicq'
import schedule from "node-schedule";

//项目路径
const _path = process.cwd();
//白名单qq群
let Gruop_qq = [];
const mr_qqGrop = true; // (true)是(false)否推送全部群，如需推送全部群请删除Gruop_qq内的群号

/**
 * mr_qqGrop设置为true的时候会默认推送全群这个时候Gruop_qq是黑名单群是不会推送的
 * mr_qqGrop设置为false的时候会只推送Gruop_qq中的群
 */

//定时推送星期四12点准时 定时区分 (秒 分 时 日 月 星期)
schedule.scheduleJob('0 0 12 * * 4', async function () {
    let msg = await Crazyfour()//获取信息
    var Blacklist = Bot.gl //获取全部群
    var data = [];
    if (!mr_qqGrop) {
        data = Gruop_qq;
    } else {
        Blacklist.forEach(function (res) {
            data.push(res.group_id)
        })
    }
    if (data.length == 0) {
        return;
    }
    for (var key of data) {
        // console.log(key)
        if (Gruop_qq.includes(key * 1) && mr_qqGrop) { //判断是否在群白名单内
            continue;
        }
        Bot.pickGroup(key * 1).sendMsg(msg)
    }
});


export class Crazy4 extends plugin {
    constructor() {
        super({
            name: 'KFC',
            dsc: '获取网页疯狂星期四文案随机发送',
            /** https://oicqjs.github.io/oicq/#events */
            event: 'message',
            priority: 1000,
            rule: [
                {
                    reg: '^#疯狂星期(一|二|三|四|五|六|七|日|天)$',
                    fnc: 'Crazy4'
                }
            ]
        })
    }

    async Crazy4(e) {
        let msg =await Crazyfour()
        if(!msg.image)
        msg = msg.replace(/四/g, e.msg.split("星期")[1]);
        e.reply(msg);
        return true;
    }
}

async function Crazyfour() {

    let url = "https://www.sxsme.com.cn/gonglue/14216.html";
    let response = await fetch(url); //调用接口获取数据
    let res = await response.text();

    let regFC4 = /<hr \/>([\s\S]*?)<hr \/>/g;


    let textFC4 = res.match(regFC4);

    let delFC4 = [];

    for (const key in textFC4) {

        if (textFC4[key].match(/<table([\s\S]*?)<\/table>/g)) {

            textFC4[key] = textFC4[key].replace(/<table([\s\S]*?)<\/table>/g, "<hr /><hr />");

            delFC4.push(key);

            let temp = textFC4[key].match(regFC4);
            for (const tempkey in temp) {
                textFC4.push(temp[tempkey]);
            }
        }
    }

    for (const key in delFC4) {
        textFC4.splice(delFC4[key], 1);
    }

    for (const key in textFC4) {
        textFC4[key] = textFC4[key].replace(/<hr \/>|<p>|<\/p>|&nbsp;|\r|\n|<br \/>/g, "");
        textFC4[key] = textFC4[key].replace(/\t/g, "\n");
        if (textFC4[key].indexOf("\r")) {
            textFC4[key] = textFC4[key].slice(1);
        }
    }


    let imgregFC4 = /https:\/\/img.sxsme.com.cn\/uploadimg\/image\/[0-9]{7,8}\/[0-9A-Za-z_]{10,30}.jpg/g;

    let imgFC4 = res.match(imgregFC4);

    for (const key in imgFC4) {
        textFC4.push(imgFC4[key]);
    }

    let FC4 = textFC4[Math.round(Math.random() * (textFC4.length - 1))];
    //console.log(FC4)
    //是不是图片？
    let trait = ["http","https"]
    return (trait.find(item=>FC4.includes(item)) ? segment.image(FC4) : FC4)
}