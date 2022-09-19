import plugin from '../../lib/plugins/plugin.js'
import cfg from '../../lib/config/config.js'
import { segment } from "oicq";

//原神语音接口说话人
let limit = [
	'派蒙', '凯亚', '安柏', '丽莎', '琴',
	'香菱', '枫原万叶', '迪卢克', '温迪',
	'可莉', '早柚', '托马', '芭芭拉', '优菈',
	'云堇', '钟离', '魈', '凝光', '雷电将军',
	'北斗', '甘雨', '七七', '刻晴', '神里绫华',
	'戴因斯雷布', '雷泽', '神里绫人', '罗莎莉亚',
	'阿贝多', '八重神子', '宵宫', '荒泷一斗',
	'九条裟罗', '夜兰', '珊瑚宫心海', '五郎',
	'散兵', '女士', '达达利亚', '莫娜', '班尼特',
	'申鹤', '行秋', '烟绯', '久岐忍', '辛焱',
	'砂糖', '胡桃', '重云', '菲谢尔', '诺艾尔',
	'迪奥娜', '鹿野院平藏'
]
let speaker = "派蒙"

export class genshinspeak extends plugin {
    constructor () {
      super({
        name: '原神说',
        dsc: '调用原神角色语音合成接口',
        /** https://oicqjs.github.io/oicq/#events */
        event: 'message',
        priority: 5000,
        rule: [
            {
                reg: '#(.*)说(.*)',
                fnc: 'speak'
            },
            {
                reg: '#切换说话者(.*)',
                fnc: 'cgSpeaker'
            },
        ]
      })
    }

    async speak(e){
		let tmp = speaker;
		let msg = e.msg.replace("#","").split("说");
		if(msg[0]&&limit.indexOf(msg[0]) > -1){
			tmp = msg[0];
		}
        let url = `http://233366.proxy.nscc-gz.cn:8888/?speaker=派蒙&text=`
		msg = encodeURI(url.replace("派蒙",tmp)) + encodeURI(msg[1])
		e.reply(segment.record(msg));
		return true;
	}

	async cgSpeaker(e){
		let keyword = e.msg.replace("#切换说话者","")
		if(limit.indexOf(keyword) > -1){
			speaker = keyword;
			console.log(speaker)
			e.reply(`说话者已切换为${keyword}`);
		}else{
			e.reply("没有这名发言者哦");
		}
		return true;
	}
}