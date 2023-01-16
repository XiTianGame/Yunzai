import plugin from '../../lib/plugins/plugin.js'
import { segment } from "oicq";
import chokidar from "chokidar";
import lodash from "lodash";
import sizeOf from "image-size";
import PATH from "path";
import fs from "fs";

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
    image: {
        /**文件后缀名正则 */
        reg: /.(jpg|jpeg|png|gif|bmp)$/,
        /**类型(用于输出日志) */
        type: "全局表情"
    },
    record: {
        reg: /.(amr|silk|slk|mp3)$/,
        type: "全局语音"
    },
    video: {
        reg: /.(mp4|avi)$/,
        type: "全局视频"
    }
}

//表情存储map
const fileArr = new Map();
//日志延时发出
const timeout = {};

init();

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
                    reg: '(.*)',
                    fnc: 'global',
                    log: false
                }
            ]
        })
    }

    async global(e) {
        if (!e.msg || !e.message || e.hasReply) {
            return false;
        }

        let msg = e.msg.replace(/#|＃|\./g, "");
        //获取msg对应资源
        let result = (fileArr.get(msg) || []).filter(path => !lodash.isEmpty(path));
        if (lodash.isEmpty(result)) return false;

        let filePath = lodash.sample(result);

        if (!fs.existsSync(filePath)) return false;

        lodash.forEach(rules,(value,key)=>{
            if(value.reg.test(filePath)){
                Bot.logger.mark(value.type + ": " + msg);
                msg = segment[key](filePath);
                //表情特殊处理
                if(key === "image"){
                    let dimensions = sizeOf(filePath);
                    let tmp = dimensions.width / dimensions.height;
                    if(dimensions.height > 150 && ((tmp > 0.6 && tmp < 1.4) || tmp > 2.5)){
                        msg.asface = true;
                    }
                }
                e.reply(msg);
            }
        })
        return true;
    }
}

//资源文件初始化
function init() {
    if(!fs.existsSync("./resources/global/")){
        fs.mkdirSync("./resources/global/",{recursive: true});
    }
    //读取资源文件
    readdirectory("./resources/global/");
    //开启监听
    watchFile("./resources/global/");
}
//读取文件
function readdirectory(dir, type) {
    if(!fs.existsSync(dir)){
        fs.mkdirSync(dir,{recursive: true});
    }
    let files = fs.readdirSync(dir, { withFileTypes: true });
    for (let val of files) {
        let filepath = PATH.join(dir, val.name);
        if (val.isDirectory()) {
            readdirectory(filepath, type);
            continue;
        } else if(!val.isFile()) continue;
        //解析路径
        let info = PATH.parse(filepath);
        lodash.forEach(rules,(value,key)=>{
            if(value.reg.test(info.ext)){
                let name = info.name.split("-");
                for(let val of name){
                    val = val.trim();
                    if(!val) continue;
                    let tmp = new Set(fileArr.get(val) || []);
                    tmp.add(filepath);
                    fileArr.set(val, Array.from(tmp));
                }
            }
        })
    }
}
//监听文件
function watchFile(dir, type) {
    const watcher = chokidar.watch(dir,{
		//忽略开始监控的文件添加
		ignoreInitial:true,
		persistent:true,
		cwd: '.',
	});
    watcher.on("add",(path)=>{
        let info = PATH.parse(path);
        //测试文件后缀名
        lodash.forEach(rules,(value,key)=>{
            if(value.reg.test(info.ext)){
                let name = info.name.split("-");
                for(let val of name){
                    val = val.trim();
                    if(!val) continue;
                    let tmp = new Set(fileArr.get(val) || []);
                    tmp.add(path);
                    fileArr.set(val, Array.from(tmp));
                }
                log(value.type);
            }
        })
    }).on("unlink",(path)=>{
        let info = PATH.parse(path);
        //测试文件后缀名
        lodash.forEach(rules,(value,key)=>{
            if(value.reg.test(info.ext)){
                let name = info.name.split("-");
                for(let val of name){
                    val = val.trim();
                    if(!val) continue;
                    let tmp = new Set(fileArr.get(val) || []);
                    tmp.delete(path);
                    fileArr.set(val, Array.from(tmp));
                }
                log(value.type);
            }
        })
    })
}
//延时发送日志
function log(type){
    if(timeout[type]){
        clearTimeout(timeout[type].timer)
        timeout[type].timer = setTimeout(()=>{
            Bot.logger.mark(`更新${timeout[type].num}个${type}`);
            delete timeout[type];
        },500);
        timeout[type].num += 1;
    } else {
        timeout[type] = {
            timer: setTimeout(()=>{
                Bot.logger.mark(`更新${timeout[type].num}个${type}`);
                delete timeout[type];
            },500),
            num: 1
        }
    }
}