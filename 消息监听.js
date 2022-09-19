import plugin from '../../lib/plugins/plugin.js'
import cfg from '../../lib/config/config.js'
import common from '../../lib/common/common.js'
import fetch from "node-fetch";
import { pipeline } from "stream";
import { promisify } from "util";
import { segment } from "oicq";
import moment from "moment";
import path from 'path';
import fs from 'fs';

//云崽目录
const _path = process.cwd()

/*************自定义设置*****************/
const monitorOn = true;//基础，是否开启监听
const monitor_all = true;//是否全局监测，开启后黑名单无效
const md_mode = true;//是否融合云崽黑名单
const md_UserQQ = [];//监测用户黑名单
const md_GroupQQ = [];//监测群黑名单
const push_mode = true;//消息推送规则定义，true：转发给推送人，false：发送到群聊
const isMaster = false;//是否监听主人消息 true为监听 false为不监听
const filesize = 5;//文件撤回会先下载到本地，允许下载的最大文件大小，单位MB
const savetime = 10;//消息保存时间，建议大于3，单位分钟
const pushlist = [];//推送人列表，如果为空就推送给全部主人
const flash_photo = true;//是否自动破解闪照


//下载临时文件夹
const filepath = `${_path}/resources/tmp`
//黑名单融合云崽设置
let blackGroup = md_GroupQQ;
let blackQQ = md_UserQQ;
if (md_mode) {
	cfg.getConfig("other").blackGroup.forEach(item => {
		blackGroup.push(item);
	})
	cfg.getConfig("other").blackQQ.forEach(item => {
		blackQQ.push(item);
	})
}

//消息发送监听
Bot.on("message.group", async (e) => {
	//console.log(e)
	//黑名单群直接退
	if (!monitorOn || blackGroup.includes(e.group_id)) {
		return false;
	}
	//获取当前时间
	let time = moment(Date.now()).format('YYYY-MM-DD HH:mm:ss');
	var data_msg = [];
	//处理消息
	for (let val of e.message) {
		switch (val.type) {
			case "text": //文本内容
				data_msg.push({
					"types": "text",
					"value": val.text,
					"time": time,
					"GroupName": e.group_name,
					"nickname": e.sender.nickname,
				})
				break;
			case "face": //表情消息
				data_msg.push({
					"types": "face",
					"value": val.id,
					"time": time,
					"GroupName": e.group_name,
					"nickname": e.sender.nickname,
				})
				break;
			case "image": //图片及表情包
				data_msg.push({
					"types": "image",
					"value": [val.url, val.asface],
					"time": time,
					"GroupName": e.group_name,
					"nickname": e.sender.nickname,
				})
				break;
			case "flash": //闪照消息
				data_msg.push({
					"types": "flash",
					"value": val.url,
					"time": time,
					"GroupName": e.group_name,
					"nickname": e.sender.nickname,
				})
				//破解闪照
				if (flash_photo) {
					await crackFlashPicture(e);
				}
				break;
			case "at": //at消息
				data_msg.push({
					"types": "at",
					"value": val.qq,
					"time": time,
					"GroupName": e.group_name,
					"nickname": e.sender.nickname,
				})
				break;
			case "xml": //合并转发消息
				data_msg.push({
					"types": "xml",
					"value": [val.data, val.id],
					"time": time,
					"GroupName": e.group_name,
					"nickname": e.sender.nickname,
				})
				break;
			case "record": //语音消息
				data_msg.push({
					"types": "record",
					"value": val.url,
					"time": time,
					"GroupName": e.group_name,
					"nickname": e.sender.nickname,
				})
				break;
			case "video": //视频消息
				data_msg.push({
					"types": "voide",
					"value": val.file,
					"time": time,
					"GroupName": e.group_name,
					"nickname": e.sender.nickname,
				})
				break;
			case "json": //json消息
				data_msg.push({
					"types": "json",
					"value": val.data,
					"time": time,
					"GroupName": e.group_name,
					"nickname": e.sender.nickname,
				})
				break;
			case "bface": //大表情消息
				data_msg.push({
					"types": "bface",
					"value": [val.file, val.text],
					"time": time,
					"GroupName": e.group_name,
					"nickname": e.sender.nickname,
				})
				break;
			case "sface": //小表情消息
				data_msg.push({
					"types": "sface",
					"value": [val.id, val.text],
					"time": time,
					"GroupName": e.group_name,
					"nickname": e.sender.nickname,
				})
				break;
			case "dice": //骰子消息
				data_msg.push({
					"types": "dice",
					"value": val.id,
					"time": time,
					"GroupName": e.group_name,
					"nickname": e.sender.nickname,
				})
				break;
			case "rps": //猜拳消息
				data_msg.push({
					"types": "rps",
					"value": val.id,
					"time": time,
					"GroupName": e.group_name,
					"nickname": e.sender.nickname,
				})
				break;
			case "location": //位置消息
				data_msg.push({
					"types": "location",
					"value": [val.lat, val.lng, val.address, val.id],
					"time": time,
					"GroupName": e.group_name,
					"nickname": e.sender.nickname,
				})
				break;
			case "share": //链接消息
				data_msg.push({
					"types": "share",
					"value": [val.url, val.title, val.image, val.content],
					"time": time,
					"GroupName": e.group_name,
					"nickname": e.sender.nickname,
				})
				break;
			case "file": //文件消息
				if (val.size > filesize * 1048576)
					break;
				data_msg.push({
					"types": "file",
					"value": [await e.group.getFileUrl(val.fid), val.name],
					"time": time,
					"GroupName": e.group_name,
					"nickname": e.sender.nickname,
				});
				break;
			case "mirai": //特殊消息
				data_msg.push({
					"types": "mirai",
					"value": val.data,
					"time": time,
					"GroupName": e.group_name,
					"nickname": e.sender.nickname,
				})
				break;
			default: //还有其他类型的消息？不会吧？
				break;
		}
	}
	//编码消息，设置消息过期时间
	redis.set(`Yunzai:setlinshimsg:${encodeURIComponent(e.message_id)}`, encodeURIComponent(JSON.stringify(data_msg)), {
		EX: 60 * savetime
	});
});


//监听撤回消息
Bot.on("notice.group.recall", async (e) => {
	//这里是判断撤回消息的人是不是拉黑的人的消息如果是便退出
	if (blackQQ.includes(e.operator_id)) {
		return true;
	}
	//这里是判断撤回消息的人是不是bot或者主人的消息如果是便退出
	if (e.operator_id == cfg.qq || (cfg.masterQQ.find(item => e.operator_id == item) && !isMaster)) {
		return true;
	}
	// 从redis获取数据
	let data = await redis.get(`Yunzai:setlinshimsg:${encodeURIComponent(e.message_id)}`);
	//这里判断缓存是否已经过期 过期的话获取为空直接return出去
	if (!data) {
		return true;
	}
	//获取当前时间
	let time = moment(Date.now()).format('YYYY-MM-DD HH:mm:ss');
	//解码消息
	var res = JSON.parse(decodeURIComponent(data))
	var msg = []; //储存解析出的撤回消息
	var prompt = []; //提示消息
	var file = false; //是否是文件消息
	var msgtype = "未知消息" //消息类型
	for (let i in res) {
		switch (res[i].types) {
			case "text":
				msg[i] = res[i].value
				msgtype = "文字消息"
				break;
			case "face":
				msg[i] = segment.face(res[i].value)
				msgtype = "表情消息"
				break;
			case "image":
				msg[i] = segment.image(res[i].value[0])
				msg[i].asface = res[i].value[1]
				msgtype = "图片消息"
				break;
			case "flash":
				msg[i] = segment.image(res[i].value)
				msgtype = "闪照消息"
				break;
			case "at":
				msg[i] = segment.at(res[i].value)
				msgtype = "at消息"
				break;
			case "xml":
				msg[i] = segment.xml(res[i].value[0], res[i].value[1])
				msgtype = "合并转发消息"
				break;
			case "record":
				msg[i] = segment.record(res[i].value)
				msgtype = "语音消息"
				break;
			case "voide":
				msg[i] = segment.video(res[i].value)
				msgtype = "视频消息"
				break;
			case "json":
				msg[i] = segment.json(res[i].value)
				msgtype = "json消息"
				break;
			case "bface":
				msg[i] = segment.bface(res[i].value[0], res[i].value[1])
				msgtype = "大表情消息"
				break;
			case "sface":
				msg[i] = segment.sface(res[i].value[0], res[i].value[1])
				msgtype = "小表情消息"
				break;
			case "dice":
				msg[i] = segment.dice(res[i].value)
				msgtype = "骰子消息"
				break;
			case "rps":
				msg[i] = segment.rps(res[i].value)
				msgtype = "猜拳消息"
				break;
			case "location":
				msg[i] = segment.location(res[i].value[0], res[i].value[1], res[i].value[2], res[i].value[3])
				msgtype = "位置消息"
				break;
			case "share":
				msg[i] = segment.share(res[i].value[0], res[i].value[1], res[i].value[2], res[i].value[3])
				msgtype = "链接消息"
				break;
			case "file":
				await getfileByUrl(res[i].value[0], filepath, res[i].value[1])
				msg[i] = path.join(filepath, res[i].value[1]);
				msgtype = "文件消息"
				file = true;
				break;
			case "mirai":
				msg[i] = segment.mirai(res[i].value)
				msgtype = "特殊消息"
				break;
			default:
				break;
		}
	}
	//如果消息为空直接退出
	if (msg.length == 0) {
		return true
	}
	prompt.unshift(
		`监测到消息撤回:\n` +
		`消息发送时间：${res[0].time}\n` +
		`群聊：${res[0].GroupName}(${e.group_id})\n` +
		`用户：${res[0].nickname}(${e.user_id})\n` +
		`消息撤回时间：${time}\n` +
		`消息类型：${msgtype}`
	)
	await send_msg(e, prompt, msg, file);
});

/**
 * 发送消息
 * @param  e 来源消息
 * @param  prompt 提示消息
 * @param  msg 撤回的消息
 * @param  file 是否是文件消息
 */
async function send_msg(e, prompt, msg, file) {
	if (push_mode) {
		let list = [];
		if (!pushlist.length==0) {
			list = pushlist
		} else {
			//发到全部主人
			list = cfg.masterQQ;
		}
		for (let userId of list) {
			Bot.pickFriend(userId).sendMsg(prompt)
			await common.sleep(200);
			if (msg) {
				//调用发送文件的方法
				if (file) {
					await Bot.pickFriend(userId).sendFile(msg)
					del_file(msg);
				} else {
					await Bot.pickFriend(userId).sendMsg(msg)
					del_file(msg);
				}
			}
		}
	} else {
		Bot.pickGroup(e.group_id).sendMsg(prompt)
		await common.sleep(200);
		if (file) {
			//群文件上传方法
			await Bot.pickGroup(e.group_id).upload(msg)
			del_file(msg);
		} else {
			await Bot.pickGroup(e.group_id).sendMsg(msg)
			del_file(msg);
		}
	}
}

//做做样子
export class monitor extends plugin {
	constructor() {
		super({
			name: '消息监听',
			dsc: '监听群内的消息',
			/** https://oicqjs.github.io/oicq/#events */
			event: 'message',
			priority: 50000,
		})
	}
}

/**
 * 删除文件
 * @param file 文件目录
 */
async function del_file(file) {
	//转字符串
	file = file.toString();
	//是否存在
	if (fs.existsSync(file)) {
		fs.unlink(file, (err) => {
			if (err) {
				console.log(err);
				return false;
			}
		})
	}
	return true
}

/**
 * 下载文件
 * @param url 下载地址
 * @param dir 下载目录
 * @param fileName 文件名
 */
async function getfileByUrl(url, dir, fileName) {
	//先检查是否存在目录
	await dirExists(dir);
	const response = await fetch(url);
	const streamPipeline = promisify(pipeline);
	await streamPipeline(response.body, fs.createWriteStream(path.join(dir, fileName)));
	//延时删除
	setTimeout(async () => {
		await del_file(path.join(dir, fileName));
	}, savetime * 1000 * 60)
}

/**
 * 路径是否存在，不存在则创建
 * @param {string} folderpath 路径
 */
async function dirExists(folderpath) {
	try {
		const pathArr = folderpath.split('/');
		let dir = '';
		for (let i of pathArr) {
			//如果存在文件夹
			if (pathArr[i]) {
				dir += `${pathArr[i]}/`;
				if (!fs.existsSync(dir)) {
					fs.mkdirSync(dir);
				}
			}
		}
	} catch (err) {
		console.log(err);
		return false;
	}
	return true;
}

/**
 * 破解闪照
 * @param e 闪照消息
 */
async function crackFlashPicture(e) {
	for (let msg of e.message) {
		// flash 闪照
		if (monitor_all || (!monitor_all && !blackQQ.includes(e.sender.user_id))) {
			if (msg.type === 'flash') {
				Bot.logger.mark(`得到闪照: ${msg.url}`);
				let replyMsg = [
					`已自动破解闪照\n`,
					`发送者：${e.sender.nickname}（${e.sender.user_id}）\n`,
					`发送群：${e.group.name}（${e.group.group_id}）`,
					segment.image(msg.url),
				]
				// 转发闪照消息
				let list = [];
				if (!pushlist.length==0) {
					list = pushlist
				} else {
					//发到全部主人
					list = cfg.masterQQ;
				}
				for (let userId of list) {
					Bot.pickFriend(userId).sendMsg(replyMsg)
				}
			}
		}
	}
}
