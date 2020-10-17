let namespace = "KinerSwitchHosts";

let localConfig = [];
let isOpen = false;

function showLog() {

    // console.log(localConfig);
    const messages = localConfig.filter(item => item && item.isOpen === true).map(item => {
        return {
            "别名": item.name,
            "域名": item.domain,
            "IP地址": item.ip
        }
    });
    log(messages);
}

function log(messages) {
    const style = `font-size:1em; background: brown; color: #ffffff; padding: 5px 15px; border-radius: 5px; box-shadow: 0 0 5px #333;`;
    const curStyle = 'color: green; background: #FFFFFF; border-radius: 5px; padding: 5px 15px;';
    console.groupCollapsed(namespace);
    if(messages.length===0){
        console.log(`%c【${namespace}】暂无开启的配置`, style);
    }else{
        const cur = messages.filter(item=>item['域名'].includes(document.domain));
        if(cur.length){
            console.log(`%c【${namespace}】当前页面匹配配置：域名[${document.domain}] 指向IP: ${cur[0]["IP地址"]}`, curStyle);
        }else{
            console.log(`%c【${namespace}】未找到与当前页面域名匹配的配置`, curStyle);
        }
        console.table(messages);
    }

    console.log(`%c【${namespace}】有任何疑问欢迎邮件:1127031143@qq.com`, style);
    console.groupEnd();
}

// const stroageKey = "KinerSwitchHostConfig";
// const KinerSwitchHostGlobalConfig = "KinerSwitchHostGlobalConfig";
function doSendMessage(){
    chrome.runtime.sendMessage(
        {greeting: "load"},
        function(response) {
            if(response){
                const favList = response.list;
                const currentFavId = response.currentFavId;
                localConfig = favList.find(item=>item.favId===currentFavId);
                if(!localConfig){
                    return;
                }
                namespace = `${namespace}[${localConfig.name}]`;
                localConfig = localConfig.config;
                isOpen = response.isOpen;
                // console.log(response);
                if(isOpen){
                    showLog();
                }
            }

        }
    );
}
doSendMessage();