import plugin from '../../lib/plugins/plugin.js'
import { segment } from "oicq";
import fetch from "node-fetch";
import {createRequire} from "module";
const require = createRequire(import.meta.url);


/*食用方法

用于私聊执行终端命令
/cmd 是触发正则。在后面写你要执行的命令。每一次发送指令执行，都是默认root目录。所以你每次执行一定要输入路径
不可以跟终端一样，先执行一步cd 路径，再执行下一步。一定一定要一次性输入。

比如删除文件/root/ABC/123
直接输入 /cmd rm -rf /root/ABC/123

如果路径太长，可以 /cmd cd 路径 && 输入命令 && 输入命令 要执行的命令一次性输进去。注意&&分割，&&前后有需要空格。然后再发送

先cd 再执行命令示例：
删除/root/ABC/目录下的123文件夹
/cmd cd /root/ABC/ && rm -rf 123


如果你不看说明，导致删错文件。自己负责！
*/
const _path = process.cwd();

//1.定义命令规则
export class cmd extends plugin {
    constructor() {
        super({
            name: '执行终端命令',
            dsc: '发送指令执行终端命令',
            /** https://oicqjs.github.io/oicq/#events */
            event: 'message',
            priority: 50,
            rule: [
                {
                    reg: '^/cmd.+$',
                    fnc: 'cmd'
                }
            ]
        })
    }


    async cmd(e) {
        if (!e.isMaster) {
            e.reply("你没有权限");
            return;
        }
        //e.msg 用户的命令消息
        console.log("用户命令：", e.msg);
        //执行的逻辑功能
        let msg = e.msg.replace("/cmd", "");
        var exec = require('child_process').exec;
        var ls = exec(` cd ${_path} ` + ' && ' + msg, function (error, stdout, stderr) {
            if (error) {
                e.reply("失败！\nError code: " + error.code + "\n" + error.stack);
            } else {
                e.reply(stdout)
            }
        })

        return true; //返回true 阻挡消息不再往下
    }
}