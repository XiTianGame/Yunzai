import plugin from '../../lib/plugins/plugin.js'
import cfg from '../../lib/config/config.js'
import { segment } from "oicq";
import fetch from "node-fetch";
// 使用方法：               =======烂   代   码========
// 1.主人：看到任意想要撤回的消息，对其回复“撤回”二字，即可撤回该条消息（若机器人不是管理员，则只能撤回机器人两分钟内的消息）
// 2.群员：若机器人发了不当消息，群员可以对该消息回复“撤回”，即可让机器人撤回该条消息。群员仅能撤回机器人发出的消息。
// ※群员撤回机器人消息的权限，可在第26行关闭

// v1.1 增加“撤回失败”的反馈
// v1.1.1 对机器人为管理员和非管理员时的“撤回失败”反馈做出区分
// v1.1.2 更正一处拼写错误
// v1.1.3 修复了主人是管理员时无法撤回消息的问题
// v1.1.4 修复了管理员撤回管理员的套娃问题


export class chehui extends plugin {
    constructor() {
        super({
            name: '引用撤回',
            dsc: '对目标消息回复撤回即可撤回该条消息',
            /** https://oicqjs.github.io/oicq/#events */
            event: 'message',
            priority: 5000,
            rule: [
                {
                    reg: '^[^-]*撤回$',
                    fnc: 'chehui'
                }
            ]
        })
    }

    async chehui(e) {
        let grpMbPmt = true;  //设为true则群员可以撤回机器人的消息。设为false则只有主人能命令机器人撤回消息
        // 判断是否为回复消息
        if (!e.source) {
            console.log("撤回消息：无撤回对象");
            return true;
        }
        // 获取原消息（感谢@喵喵和@牧星长的获取被引用消息的方法，喵佬，俺滴超人！牧佬，俺滴超人！）
        let source;
        if (e.isGroup) {
            source = (await e.group.getChatHistory(e.source.seq, 1)).pop();
        } else {
            source = (await e.friend.getChatHistory(e.source.time, 1)).pop();
        }
        if (!e.isMaster && (e.sender.role == "owner" || e.sender.role == "admin") && source.sender.user_id == e.sender.user_id) {  //如果发起撤回的人是管理或者群主，且目标消息的发送人就是他自己
            let msg = ["有没有一种可能，你自己就可以撤回呢"]
            e.reply(msg);
            return true;
        }
        if (!e.isMaster && (e.sender.role == "owner" || e.sender.role == "admin") && source.sender.role != "owner" && source.sender.role != "admin") {  //如果发起撤回的人是管理或者群主，且目标消息的发送人不是管理或者群主
            let msg = ["有没有一种可能，你自己就可以撤回呢"]
            e.reply(msg);
            return true;
        }
        if (!e.isMaster && e.sender.role == "admin" && (source.sender.role == "owner" || source.sender.role == "admin") && source.sender.user_id != cfg.qq) {  //如果发起撤回的人是管理，且目标消息的发送人是其他管理或者群主，且目标消息的发送人不是机器人
            let msg = ["你想撤回的消息只有群主有权限哦~"]
            e.reply(msg);
            return true;
        }

        // 撤回消息======================================================================================\\
        let target = null;
        if (e.isGroup) {
            target = e.group;
        } else {
            target = e.friend;
        }

        if (target != null) {
            // 判断权限：命令者是主人 或者 命令者不是主人 && 群友撤回权限开启
            if (e.isMaster || (!e.isMaster && grpMbPmt)) {
                target.recallMsg(source.message_id);//撤回目标消息
                await sleep(300);//测试中同时撤回两条消息有概率出现第二条消息在退出该页面之前仍然存在的情况，所以这里间隔300ms

                let recallcheck;//这块代码用来检测目标消息是否已经被撤回-------------------------\\
                if (e.isGroup) {//获取本该被撤回的消息。分为群聊和私聊
                    recallcheck = (await e.group.getChatHistory(e.source.seq, 1)).pop();
                } else {
                    recallcheck = (await e.friend.getChatHistory(e.source.time, 1)).pop();
                }
                // console.log("recallcheck:", recallcheck);
                if (recallcheck) {//如果获取到值，说明目标消息还存在
                    // console.log("没撤回");
                    if (e.isGroup) { //是群聊
                        //定义recallFailReply用于保存“撤回失败”的提醒消息，以便稍后把提醒消息也撤回
                        let rclFailRpl;
                        if (!e.group.is_admin && !e.group.is_owner)     //如果不是管理和群主
                            rclFailRpl = await e.reply("派蒙不是管理员，无法撤回两分钟前的消息或别人的消息哦~");//“撤回失败”的提醒。这里感谢@pluto提供了发送消息的同时获取该条消息的方法
                        else  //是管理
                            rclFailRpl = await e.reply("派蒙无法撤回其他管理员和群主的消息哦~");

                        await sleep(10000);//10秒后，把“撤回失败”的提醒撤回掉：
                        source = (await e.group.getChatHistory(rclFailRpl.seq, 1)).pop();//获取消息内容
                        await sleep(100);
                        e.group.recallMsg(source.message_id);//撤回消息
                    } else {          //是私聊
                        let rclFailRpl = await e.reply("派蒙无法撤回自己两分钟前的消息和你的消息哦~");
                        await sleep(10000);//10秒后，把提醒撤回掉：
                        source = (await e.friend.getChatHistory(rclFailRpl.time, 1)).pop();//获取消息内容
                        await sleep(100);
                        e.friend.recallMsg(source.message_id);//撤回消息
                    }
                    return true;
                }//-------------------------------------------------------------------------//

                target.recallMsg(e.message_id);//撤回“撤回”命令
            }
        }//=============================================================================================//
        return true; //返回true 阻挡消息不再往下
    }
}

function sleep(ms) {//咋瓦鲁多函数，单位毫秒
    return new Promise((resolve) => setTimeout(resolve, ms));
}