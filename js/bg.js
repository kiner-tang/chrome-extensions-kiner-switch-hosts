const stroageKey = "KinerSwitchHostConfig";
const KinerSwitchHostGlobalConfig = "KinerSwitchHostGlobalConfig";
let oldConfig = [];
let info = {};
let isOpen = false;

function getConfig(cb) {
    chrome.storage.local.get([stroageKey], function (result) {
        // alert(JSON.stringify(result));
        oldConfig = (result || {})[stroageKey] || [];
        cb && cb(result);
    });
}

function saveConfig(config, replace = false) {
    const newArr = replace ? config : [...(Array.isArray(oldConfig) ? oldConfig : []), ...(Array.isArray(config) ? config : [])];
	oldConfig = newArr;
	info = {
		list: oldConfig,
		isOpen
	};
	startListener();
    chrome.storage.local.set({[stroageKey]: newArr}, function () {
        // Notify that we saved.
        // message('保存成功');
    });
}

function saveGlobalSwitch(val) {
	isOpen = val;

	info = {
		list: oldConfig,
		isOpen
	};

	startListener();
    chrome.storage.local.set({[KinerSwitchHostGlobalConfig]: val}, function () {
        // Notify that we saved.
        // message('保存成功');
    });
}

function storageSet(key, val, cb){
    chrome.storage.local.set({[key]: val}, cb);
}

function storageGet(key, defaultVal, cb){
    let realKey = Array.isArray(key)?key:[key];
    chrome.storage.local.get(realKey, function (result) {
        console.log(result[realKey[0]]);
        cb && cb(result[realKey[0]]?result[realKey[0]]:defaultVal);
    });
}


function getGlobalSwitch(cb) {
    chrome.storage.local.get([KinerSwitchHostGlobalConfig], function (result) {
        cb && cb(result);
    });
}

function removeIdx(idx, item) {
    if (item) {
        oldConfig.splice(idx, 1, item);
    } else {
        oldConfig.splice(idx, 1);
    }
	info = {
		list: oldConfig,
		isOpen
	};

    chrome.storage.local.set({[stroageKey]: oldConfig}, function () {
        // Notify that we saved.
        console.log('保存成功');
    });
}

function removeIdxs(idxs, item) {

    idxs.sort(function (a, b) {
        return b - a;
    }).forEach((item, index) => {
        oldConfig.splice(item, 1);
    });
	info = {
		list: oldConfig,
		isOpen
	};

    chrome.storage.local.set({[stroageKey]: oldConfig}, function () {
        // Notify that we saved.
        console.log('保存成功');
    });
}

chrome.storage.onChanged.addListener(function (changes, namespace) {
    for (var key in changes) {
        var storageChange = changes[key];
        console.log('Storage key "%s" in namespace "%s" changed. ' +
            'Old value was "%s", new value is "%s".',
            key,
            namespace,
            storageChange.oldValue,
            storageChange.newValue);
    }
});


function updateConfig(isSendMessage = false) {
    chrome.storage.local.get([KinerSwitchHostGlobalConfig, stroageKey], function (result) {
        const list = result[stroageKey];
        const isOpen = result[KinerSwitchHostGlobalConfig];
		info = {
			list,
			isOpen
		};
		startListener();
        // console.log(isOpen);
        // if(isSendMessage){
        // 	sendMessageToContentScript({isOpen, list});
        // }
        if (isOpen) {
            proxy(list);
        } else {
            chrome.proxy.settings.set({'value': {'mode': 'direct'}}, function (e) {
                console.log(e)
            });
        }
    });

}

updateConfig(true);

function proxy(hostsList) {
    let condition = ``;
    hostsList.forEach(item => {
        if (item.isOpen&&item.domain) {
        	const realDomain = item.domain.replace(/\./g, "\\.");
            // TODO 解决https的代理问题
            condition += `
                if(shExpMatch(url, 'http:\/\/${realDomain}*')){
                    return 'PROXY ${item.ip}:80';
                }
		    `;
        }
    });
    const script = `var FindProxyForURL = function(url, host){
						${condition}
						return 'DIRECT'
					}
	`;

    // console.log(script);

    const config = {
        mode: "pac_script",
        pacScript: {
            data: script
        }
    };

    chrome.proxy.settings.set({value: config, scope: 'regular'}, function () {
    });
}
chrome.storage.local.get([KinerSwitchHostGlobalConfig, stroageKey],function (result) {
	info = {
		list: result[stroageKey],
		isOpen: result[KinerSwitchHostGlobalConfig]
	};
});
startListener();
function startListener(){
	// 监听消息
	chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {

		console.log(info);
		sendResponse(info);

	});
}