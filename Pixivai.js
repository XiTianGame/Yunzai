import plugin from '../../lib/plugins/plugin.js'
import cfg from '../../lib/config/config.js'
import { segment } from "oicq";
import fs from 'fs';
import { createRequire } from "module";
const require = createRequire(import.meta.url);

//劝退警告！爬虫搭建难度较大！且需要预留20G的空间，请自行决定去留

/*本插件依赖于 https://github.com/7eu7d7/pixiv_AI_crawler
使用前请依照爬虫教程自行安装好爬虫环境依赖（吐槽:wdnmd依赖17.5G什么鬼）
不会的看视频 https://www.bilibili.com/video/BV1RG4y1Y78o
确认在cmd的环境下可以直接调用miniconda3（输入conda activate pixivai显示可以进入虚拟环境即可）

如果cmd直接调用conda虚拟环境不行就先输入 conda init 然后重启cmd

食用方法：将插件放在 云崽根目录\plugins\example 里
自行修改 pixivai 的目录
如果你魔改了爬虫的设置请自行修改代码（不会别瞎改，用插件之前先看看能不能爬到）
爬取示例（#爬取 多少 张 关键字 图片）例：#爬取50张甘雨图片（经测试好像图片不能少于50）
量词是必须的，可以不写数字，但不能没量词，否则会报错
*/

const _path = process.cwd();//云崽目录
const pixivfiles = `${_path}/plugins/pixiv-AI-crawler`//pixiv爬虫目录
let photo_json = JSON.parse(fs.readFileSync(`${pixivfiles}/images_85/tags.json`, "utf8"));//爬取到的图片json位置

export class pixivai extends plugin {
    constructor() {
        super({
            name: 'P站扒图',
            dsc: '由训练后的ai进行爬图',
            /** https://oicqjs.github.io/oicq/#events */
            event: 'message',
            priority: 3000,
            rule: [
                {
                    reg: '^#爬取(.*)图片$',
                    fnc: 'AIcrawler'
                },
                {
                    reg: '^#P站图片列表$',
                    fnc: 'pixivlist'
                },
                /*还没想到咋写，暂时鸽了
                {
                    reg: '^#随机P站图片$',
                    fnc: 'randomphoto'
                },*/
                {
                    reg: '^#查看图片(.*)$',
                    fnc: 'appointphoto'
                }
            ]
        })
    }

    async AIcrawler(e) {
        if (!e.isMaster) {
            e.reply("爬什么爬，给爷爬");
            return true;
        }
        let command

        let msg = e.msg.replace(/#|爬取|图片/g, "").replace(/张|个|组/g, ",").split(",");//替换和分类
        let quantity = msg[0]
        let keyword = msg[1]
        var exec = require('child_process').exec;//准备发起命令
        e.reply("爬取图片中，请耐心等待哦")
        //匹配不同指令的cmd命令
        if (quantity && keyword) {
            command = ` cd ${pixivfiles} && conda activate pixivai && python AIcrawler.py --n_images ${quantity} --keyword ${keyword}`
        } else if (quantity && !keyword) {
            command = ` cd ${pixivfiles} && conda activate pixivai && python AIcrawler.py --n_images ${quantity}`
        } else if (!quantity && keyword) {
            command = ` cd ${pixivfiles} && conda activate pixivai && python AIcrawler.py --keyword ${keyword}`
        } else if (!quantity && !keyword) {
            command = ` cd ${pixivfiles} && conda activate pixivai && python AIcrawler.py`
        }
        //发起cmd调用python的pixiv爬虫
        var ls = exec(command, function (error, stdout, stderr) {
            if (error) {
                e.reply("失败！\nError code: " + error.code + "\n" + error.stack);
            } else {
                e.reply("爬取成功！你可以通过#P站图片列表来查看爬取的图片");
                sleep(2000)//睡一会
                photo_json = JSON.parse(fs.readFileSync(`${pixivfiles}/images_85/tags.json`, "utf8"));//刷新数据
            }
        })

        return true; //返回true 阻挡消息不再往下
    }

    async pixivlist(e) {
        let msg = []
        let keyjson = Object.keys(photo_json)//获取json里的全部的id
        //每一个id都执行一遍
        keyjson.forEach((keyname) => {
            let photo = []
            let tmp = find(keyname);
            let num = tmp.count;
            if (tmp.site) {
                if (tmp.imgname.includes("ugoira")) {
                    while (num >= 0) {//历遍一个编号的全部图片
                        if (fs.existsSync(`${tmp.photopath + keyname + "_ugoira" + num + tmp.format}`)) {//判断是否存在目录
                            photo.push(`\n${tmp.site}:${keyname + "_ugoira" + num + tmp.format}\n`)//键入图片类型和名字
                            photo.push(segment.image(`${tmp.photopath + keyname + "_ugoira" + num + tmp.format}`))//键入图片本体
                        }
                        num = num - 1;//寻找下一个p的图片
                    }
                } else {
                    while (num >= 0) {//历遍一个编号的全部图片
                        if (fs.existsSync(`${tmp.photopath + keyname + "_p" + num + tmp.format}`)) {//判断是否存在目录
                            photo.push(`\n${tmp.site}:${keyname + "_p" + num + tmp.format}\n`)//键入图片类型和名字
                            photo.push(segment.image(`${tmp.photopath + keyname + "_p" + num + tmp.format}`))//键入图片本体
                        }
                        num = num - 1;//寻找下一个p的图片
                    }
                }
                //组装msg
                msg.push({
                    message: photo,
                    nickname: Bot.nickname,
                    user_id: cfg.qq,
                });
            }
        });
        //组装合并消息
        if (this.e.isGroup) {
            msg = await this.e.group.makeForwardMsg(msg)
        } else {
            msg = await this.e.friend.makeForwardMsg(msg)
        }
        //发送消息
        e.reply(msg);
        return true;
    }

    async appointphoto(e) {
        let msg = []
        let keyword = e.msg.replace("#查看图片", "")//获取关键字
        let tmp = find(keyword)
        let num, count//用来计数的

        if (photo_json[keyword]) { //看看有没有这个玩意
            num = photo_json[keyword].length
            count = 0;
            msg.push(`编号：${keyword}\n关键词：\n`)
            while (count < num) {
                msg.push(`\n${photo_json[keyword][count]}`);//把全部关键词都导入
                count++;
            }
            e.reply(msg)
        } else e.reply(`编号：${keyword}\n没有找到关键词`)//没找到id的提示语

        //开始处理图片，看看是否存在这个图片的类型
        if (tmp.site) {
            num = tmp.count;
            msg = [];//清空消息准备发图
            if (tmp.imgname.includes("ugoira")) {
                while (num >= 0) {//历遍一个编号的全部图片
                    if (fs.existsSync(`${tmp.photopath + keyword + "_ugoira" + num + tmp.format}`)) {//判断是否存在目录
                        msg.push(segment.image(`${tmp.photopath + keyword + "_ugoira" + num + tmp.format}`))//键入图片本体
                    }
                    num = num - 1;//寻找下一个p的图片
                }
            } else {
                while (num >= 0) {//历遍一个编号的全部图片
                    if (fs.existsSync(`${tmp.photopath + keyword + "_p" + num + tmp.format}`)) {//判断是否存在目录
                        msg.push(segment.image(`${tmp.photopath + keyword + "_p" + num + tmp.format}`))//键入图片本体
                    }
                    num = num - 1;//寻找下一个p的图片
                }
            }
            e.reply(msg)//发送图片消息
        } else e.reply("没有找到该图片T^T")//什么居然没找到？是不是发错id了
        return true//阻挡消息继续往下
    }
}

/**
 * 从三个文件夹里寻找图片
 * @param {图片的id} name 
 */
function find(name) {
    let photopath, site, imgname//路径，关键字，图片名
    let count, format//最大标号，格式
    //导入三个文件夹的全部文件
    let lily = fs.readdirSync(`${pixivfiles}/images_85/百合`)
    let setu = fs.readdirSync(`${pixivfiles}/images_85/高质量涩图`)
    let other = fs.readdirSync(`${pixivfiles}/images_85/其他`)
    //历遍全部的文件搜寻名字
    lily.map((photoname) => {
        if (photoname.includes(name)) {
            photopath = `${pixivfiles}/images_85/百合/`
            site = "百合图片"
            imgname = `${photoname}`
            count = photoname.replace(name, "").replace(/_ugoira|_p|.jpg|.jpeg|.png|.gif|.bmp/g, "")
            format = photoname.replace(name, "").replace(`_p${count}`, "").replace(`_ugoira${count}`, "")
        }
    });
    if (!photopath) {
        setu.map((photoname) => {
            if (photoname.includes(name)) {
                photopath = `${pixivfiles}/images_85/高质量涩图/`
                site = "高质量涩图"
                imgname = `${photoname}`
                count = photoname.replace(name, "").replace(/_ugoira|_p|.jpg|.jpeg|.png|.gif|.bmp/g, "")
                format = photoname.replace(name, "").replace(`_p${count}`, "").replace(`_ugoira${count}`, "")
            }
        });
    }
    if (!photopath) {
        other.map((photoname) => {
            if (photoname.includes(name)) {
                photopath = `${pixivfiles}/images_85/其他/`
                site = "其他图片"
                imgname = `${photoname}`
                count = photoname.replace(name, "").replace(/_ugoira|_p|.jpg|.jpeg|.png|.gif|.bmp/g, "")
                format = photoname.replace(name, "").replace(`_p${count}`, "").replace(`_ugoira${count}`, "")
            }
        });
    }
    return { photopath, site, imgname, count, format };//返回图片的相关信息
}

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}