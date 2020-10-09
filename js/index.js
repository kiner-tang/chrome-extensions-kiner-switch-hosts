const stroageKey = "KinerSwitchHostConfig";
const favListKey = "fav-list";
const currentFavIdKey = "currentFavIdKey";
let localConfig;
let favList = [];
let currentFavId = "";
const tags = new Set();

let colors = [
    'rgba(0,102,153,0.47)',
    'rgba(0,200,153,0.47)',
    'rgba(88,99,204,0.47)',
    'rgba(0,204,204,0.47)',
    'rgba(200,102,153,0.47)',
    'rgba(102,204,204,0.47)',
    'rgba(153,102,204,0.47)',
    'rgba(153,204,153,0.47)',
    'rgba(204,102,153,0.47)',
    'rgba(255,153,153,0.47)'
];
let colorIdx = 0;
let domainColor = {};


const tpl = `<div class="list-item" data-idx="{{idx}}" data-uid="{{uid}}" style="background-color: {{bgColor}};">
                <div class="cell checkbox">
                    <div class="checkout-box"></div>
                </div>
                <div class="cell idx">{{idx}}</div>
                <div class="cell can-edit domain" data-key="domain">{{domain}}</div>
                <div class="cell can-edit ip" data-key="ip">{{ip}}</div>
                <div class="cell can-edit alias" data-key="name">{{name}}</div>
                <div class="cell tags">{{tags}}</div>
                <div class="switch-btn {{display}}">
                    <div class="bg"></div>
                    <div class="front-btn"></div>
                </div>
                <div class="del-btn">删除</div>
            </div>`;


$('.switch-btn').click(function () {
    $(this).toggleClass('active');
    const bg = chrome.extension.getBackgroundPage();
    bg.saveGlobalSwitch($(this).hasClass('active'));
    bg.updateConfig();
});

$('.add-host-panel .save-btn').click(function () {
    addHost();

    $('.add-host-panel').hide();
    $('.list').show();
    $('.tools-panel').show();
    $('.tag-panel').show();
});

$('.add-host-panel .cancel-btn').click(function () {
    $('.add-host-panel').hide();
    $('.list').show();
    $('.tools-panel').show();
});

$('.header .add-btn').click(function () {
    $('.list').hide();
    $('.tag-panel').hide();
    $('.add-host-panel').show();
    $('.tools-panel').hide();
});

$('.save-fav').click(function () {
    saveFav(localConfig);
});

$('.fav-config').on('click', function () {
    showFavPanel();
});
$('.fav-panel').on('click', '.mask', function () {
    hideFavPanel();
});

$('.tag-panel').on('click', '.tag', function () {
    $('.filter-input').val($(this).text());
    $('.filter-btn').click();
});

function showFavPanel() {
    $('.fav-panel').show().find('.mask').fadeIn().end().find('.fav-content-box').css({
        transform: `translateX(0)`
    });
}

function hideFavPanel() {
    $('.fav-panel').find('.mask').fadeOut().end().find('.fav-content-box').css({
        transform: `translateX(100%)`
    });
    setTimeout(() => {
        $('.fav-panel').hide();
    }, 300);
}


$('body').on('click', '.list-item .del-btn', function () {
    const uid = $(this).parents('.list-item').data('uid');
    const idx = localConfig.findIndex(item => item.id === uid);
    del(idx+1);
    const conf = favList.find(item=>item.favId===currentFavId);
    conf.config.splice(idx,1);
    updateConfigInFavList(currentFavId, conf,function () {
        updateTag();
        renderTags();
        renderList();
    });
}).on('click', '.list-item .can-edit', function () {
    $(this).attr('contenteditable', true);
}).on('blur', '.list-item .can-edit', function () {
    const uid = $(this).parents('.list-item').data('uid');
    const newVal = $(this).html();
    const key = $(this).data('key');
    const bg = chrome.extension.getBackgroundPage();

    const old = localConfig.find(item => item.id === uid);
    const oldIdx = localConfig.findIndex(item => item.id === uid);

    const newItem = {...old, [key]: newVal};
    // alert(JSON.stringify(newItem));

    bg.removeIdx(oldIdx, newItem);
    renderList();

}).on('click', '.list .switch-btn', function () {
    const uid = $(this).parents('.list-item').data('uid');
    const old = localConfig.find(item => item.id === uid);
    // const bg = chrome.extension.getBackgroundPage();
    // const newItem = {...old, isOpen: !old.isOpen};
    const newArr = localConfig.map((item, index) => {

        if (item.domain === old.domain) {
            if (item.id === uid) {
                return {
                    ...item,
                    isOpen: !item.isOpen
                };
            } else {
                return {
                    ...item,
                    isOpen: false
                };
            }
        } else {
            return item
        }
    });

    update(newArr, true);
}).on('click', '.list-item .checkout-box', function () {
    $(this).toggleClass('checked');
});

$('#file').change(function (e) {
    const files = e.target.files;
    importCsvFile(files[0], function () {
        $('#file').val('');
    });
});

$('.more-btn-box').mouseover(function () {
    preExport();
    preExportFav();
});

$('.filter-btn').click(function () {
    filter($('.filter-input').val().trim())
});

$('.filter-input').on('keydown', e => {
    if (e.keyCode === 13) {
        filter($('.filter-input').val().trim());
    }
});

let isSelectedAll = false;

$('.select-all').click(function () {
    if (isSelectedAll) {
        $('.list-item .checkout-box').removeClass('checked');
        $('.select-all .checkout-box').removeClass('checked');
    } else {
        $('.list-item .checkout-box').addClass('checked');
        $('.select-all .checkout-box').addClass('checked');
    }
    isSelectedAll = !isSelectedAll
});

$('.select-reverse').click(function () {
    let checkoutbox = $('.list-item .checkout-box');
    checkoutbox.each(function (index, item) {
        if ($(item).hasClass('checked')) {
            $(item).removeClass('checked');
        } else {
            $(item).addClass('checked');
        }
    });
});
$('.select-open').click(function () {
    let checkoutbox = $('.list-item .checkout-box');
    checkoutbox.each(function (index, item) {
        let idx = $(this).parents('.list-item').data('idx');
        if (localConfig[idx - 1].isOpen) {
            $(item).addClass('checked');
        } else {
            $(item).removeClass('checked');
        }
    });
});

$('.del-select').click(function () {
    const selectItem = getSelectItem();
    const bg = chrome.extension.getBackgroundPage();
    const idxs = selectItem.map(item => item.idx);
    bg.removeIdxs(idxs);
    renderList();
    resetToolsPanel();
});
$('.open-select').click(function () {
    const selectItem = getSelectItem();
    const bg = chrome.extension.getBackgroundPage();
    $.each(selectItem, function (index, item) {
        const old = localConfig[item.idx - 1];

        const newItem = {...old, isOpen: true};
        bg.removeIdx(item.idx - 1, newItem);
    });
    renderList();
    resetToolsPanel();
});
$('.close-select').click(function () {
    const selectItem = getSelectItem();
    const bg = chrome.extension.getBackgroundPage();
    $.each(selectItem, function (index, item) {
        const old = localConfig[item.idx - 1];

        const newItem = {...old, isOpen: false};
        bg.removeIdx(item.idx - 1, newItem);
    });
    renderList();
    resetToolsPanel();
});

$('.fav-panel').on('click', '.fav-list-item', function () {
    let favId = $(this).data('id');
    setFavConfigToLocalConfigByFavId(favId);
    initFavList(function () {
        renderList();
        hideFavPanel();
    });
});

$('.fav-panel .del-all').click(function () {
    const bg = chrome.extension.getBackgroundPage();
    bg.storageSet(favListKey, []);
    bg.storageSet(currentFavIdKey, "");
    renderFavList([]);
    renderList();
});

function showInputCsv() {
    $('.config-input').show();
    $('.add-host-panel').hide();
    $('.list').hide();
}

function hideInputCsv() {
    $('.config-input').hide();
    $('.add-host-panel').hide();
    $('.list').show();
}

$('.input-csv').click(function () {
    showInputCsv()
})
$('.config-input').on('click', '.save-btn', function () {
    const csv = $('.config-area').val().trim();
    if (csv.length === 0) {
        alert('请输入要导入的csv内容');
        return;
    }
    importCsv(csv, function () {
        hideInputCsv();
    })
}).on('click', '.cancel-btn', function () {
    $('.config-area').val('');
    hideInputCsv();
});

$('#favJson').change(function (e) {
    const files = e.target.files;
    importFavJsonFile(files[0], function () {
        $(this).val('');
    })
});

function importFavJsonFile(file, cb){
    const reader = new FileReader();
    reader.onload = function () {
        const res = reader.result;
        if (res) {
            importFavJson(res, cb);
        }
    };
    reader.readAsText(file);
}

function importFavJson(res, cb){
    const bg = chrome.extension.getBackgroundPage();
    let json = {};
    try{
        json = JSON.parse(res);
    }catch (e) {
        json = {};
    }

    favList = json;
    bg.storageSet(favListKey, json, function () {
        initFavList();
    });
    // console.log(json);
}


function preExport() {
    if (!localConfig) {
        return;
    }
    let txt = "别名,域名,ip地址,是否默认打开,标签\n";
    const curFav = favList.find(item => item.favId === currentFavId);
    txt += localConfig.map(item => `${item.name},${item.domain},${item.ip},${item.isOpen},${item.tags}`).join('\n');
    // console.log(txt);
    initCsvLink(txt, `${curFav.name}.csv`);
}

function preExportFav() {
    if (!favList) {
        return;
    }
    // console.log(txt);
    initJSONLink(JSON.stringify(favList, null, 4), `KinerSwitchHost偏好列表.json`);
}

function initJSONLink(data, fileName) {
    data = "\ufeff" + data;
    const blob = new Blob([data], {type: 'text/json,charset=UTF-8'});
    const csvUrl = URL.createObjectURL(blob);
    const link = $("#exportFav");
    link.attr("href", csvUrl);
    link.attr("download", fileName);
}
function initCsvLink(data, fileName) {
    data = "\ufeff" + data;
    const blob = new Blob([data], {type: 'text/csv,charset=UTF-8'});
    const csvUrl = URL.createObjectURL(blob);
    const link = $("#export");
    link.attr("href", csvUrl);
    link.attr("download", fileName);
}


function setFavConfigToLocalConfigByFavId(favId) {
    const bg = chrome.extension.getBackgroundPage();
    const favConfig = favList.find(item => item.favId === favId);
    bg.storageSet(currentFavIdKey, favId);
    localConfig = favConfig.config;
    update(localConfig, true);
    console.log(`[${favId}]当前配置：`, localConfig);
    return favConfig;
}

function resetToolsPanel() {
    $('.select-all .checkout-box').removeClass('checked');
    isSelectedAll = false;
}

function dateFormat(fmt, date) {
    let ret;
    const opt = {
        "Y+": date.getFullYear().toString(),        // 年
        "M+": (date.getMonth() + 1).toString(),     // 月
        "D+": date.getDate().toString(),            // 日
        "H+": date.getHours().toString(),           // 时
        "m+": date.getMinutes().toString(),         // 分
        "s+": date.getSeconds().toString()          // 秒
        // 有其他格式化字符需求可以继续添加，必须转化成字符串
    };
    for (let k in opt) {
        ret = new RegExp("(" + k + ")").exec(fmt);
        if (ret) {
            fmt = fmt.replace(ret[1], (ret[1].length == 1) ? (opt[k]) : (opt[k].padStart(ret[1].length, "0")))
        }
    }
    return fmt;
}

function saveFav(config) {

    const uid = createUid();

    const name = window.prompt("请输入偏好配置名称", "");
    if (!name) {
        return;
    }
    const bg = chrome.extension.getBackgroundPage();

    bg.storageGet(favListKey, [], function (res) {
        console.log(res);
        res.push({
            favId: uid,
            name,
            config: config,
            timeStamp: Date.now()
        });

        bg.storageSet(favListKey, res, function () {
            initFavList();
        });

    });

}

function getSelectItem() {
    let res = [];
    $('.list-item').each(function (index, item) {
        if ($(item).find('.checkout-box.checked').length !== 0) {
            const idx = $(item).data('idx');
            res.push({
                idx: idx - 1,
                data: localConfig[idx - 1]
            })
        }
    });

    return res;
}

/**
 * 导入csv数据
 * @param res
 * @param cb
 */
function importCsv(res, cb) {
    //显示文件内容
    const arr = res.split("\n").slice(1);
    const result = arr.map(item => {
        const vals = item.split(',');
        vals[4].split(":").forEach(item=>!tags.has(item)&&tags.add(item));
        return {
            id: createUid(),
            name: vals[0],
            domain: vals[1],
            ip: vals[2],
            isOpen: vals[3].toLowerCase() === "true",
            tags: vals[4]
        };
    });
    console.log(result);
    update(result);
    updateTag();
    cb && cb();
}

function importCsvFile(file, cb) {
    const reader = new FileReader();
    reader.onload = function () {
        const res = reader.result;
        if (res) {
            importCsv(res, cb);
        }
    };
    reader.readAsText(file);
}

/**
 * 删除指定索引的数据
 * @param idx 从1开始的索引
 */
function del(idx) {
    const bg = chrome.extension.getBackgroundPage();
    bg.removeIdx(idx - 1);
    renderList();
}

/**
 * 将form序列化的数组转化成json对象
 * @param arr
 * @returns {{}}
 */
function parseObj(arr) {
    let obj = {};
    arr.forEach(item => {
        obj[item.name] = item.value;
    });
    obj.isOpen = false;
    return obj;
}

/**
 * 对表单进行校验
 * @param config
 * @returns {boolean}
 */
function doValidate(config) {
    if (config.name.length === 0) {
        alert('请输入别名');
        return false;
    }
    if (config.domain.length === 0) {
        alert('请输入域名');
        return false;
    }
    if (config.ip.length === 0) {
        alert('请输入IP');
        return false;
    }
    return true;
}


/**
 * 渲染界面
 */
function renderList(cb) {
    const bg = chrome.extension.getBackgroundPage();
    const val = $('.filter-input').val().trim();

    if (val) {
        filter(val);
        cb&&cb();
    } else {

        bg.getGlobalSwitch(globalRes => {
            // console.log(globalRes);
            if (globalRes.KinerSwitchHostGlobalConfig) {
                $('.global-switch').addClass('active');
            }
            bg.getConfig(res => {
                localConfig = (res || {})[stroageKey] || [];
                localConfig = localConfig.filter(item=>!!item);
                bg.updateConfig();
                // 监听消息
                chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {

                    sendResponse({
                        list: localConfig,
                        isOpen: globalRes.KinerSwitchHostGlobalConfig
                    });
                });
                render(localConfig);
                localConfig.forEach(config=>{
                    config.tags.split(":").forEach(item=>!tags.has(item)&&tags.add(item));
                });
                console.log(localConfig, tags);
                updateTag();
                cb&&cb();
            });
        });

    }


}

/**
 * 执行列表数据渲染逻辑
 * @param arr
 */
function render(arr) {
    let html = '';
    if (arr.length === 0) {
        $('.list').addClass('no-record');
    } else {
        $('.list').removeClass('no-record');
    }
    arr.forEach((item, idx) => {
        if (!domainColor[item.domain]) {
            domainColor[item.domain] = colors[colorIdx++];
            if (colorIdx === colors.length - 1) {
                colorIdx = 0;
            }
        }
        html += tpl.replace(/\{\{idx\}\}/g, `${idx + 1}`)
            .replace(/\{\{uid\}\}/g, item.id)
            .replace(/\{\{tags\}\}/g, item.tags.split(':').map(item=>`<span class="tag">${item}</span>`).join(''))
            .replace(/\{\{bgColor\}\}/g, domainColor[item.domain])
            .replace(/\{\{name\}\}/g, item.name)
            .replace(/\{\{domain\}\}/g, item.domain)
            .replace(/\{\{ip\}\}/g, item.ip)
            .replace(/\{\{display\}\}/g, item.isOpen ? 'active' : '');
    });

    $('.list').html(html);
}

function updateTag(){
    const bg = chrome.extension.getBackgroundPage();
    bg.storageSet("tags", Array.from(tags));
    renderTags();
}

function renderTags(){
    const bg = chrome.extension.getBackgroundPage();
    bg.storageGet("tags", [], function (res) {
        console.log('tags:', tags);
        const tagPanel = $('.tag-panel');
        let html = "";
        res.forEach(item=>{
            html+=`<span class="tag">${item}</span>`;
        });
        tagPanel.html(html);
    })
}


/**
 * 更新界面
 * @param config
 * @param isReplace
 */
function update(config, isReplace = false) {
    const bg = chrome.extension.getBackgroundPage();
    bg.saveConfig(config, isReplace,function () {
        renderList();
    });
}

/**
 * 对列表数据进行筛选
 * @param val
 */
function filter(val) {
    if (!val) {
        renderList();
    }
    const bg = chrome.extension.getBackgroundPage();
    bg.getConfig(res => {

        localConfig = (res || {})[stroageKey] || [];

        let arr = localConfig.filter(item => {
            return item.name.includes(val) || item.domain.includes(val) || item.ip.includes(val) || item.tags.includes(val);
        });

        render(arr);

    });

}

function createUid() {
    return `${parseInt((Math.random() * 9999999999999) + "")}_${Date.now()}`
}

function updateConfigInFavList(favId, config, cb){
    const bg = chrome.extension.getBackgroundPage();
    const conf = favList.find(item=>item.favId===favId);
    const confIndex = favList.findIndex(item=>item.favId===favId);
    conf.config.push(config);
    favList.splice(confIndex, 1, conf);
    bg.storageSet(favListKey, favList, function () {
        cb && cb();
    });
}

/**
 * 新增host
 */
function addHost() {
    // console.log('test');
    const bg = chrome.extension.getBackgroundPage();

    bg.getConfig(res => {
        localConfig = (res || {})[stroageKey] || [];
        // console.log(localConfig);
        const form = $('#form').serializeArray();
        const config = parseObj(form);
        config.id = createUid();
        config.tags.split(':').forEach(tag=>!tags.has(tag)&&tags.add(tag));

        if (doValidate(config)) {
            localConfig.push(config);
            updateConfigInFavList(currentFavId, config,function () {
                updateTag();
                renderTags();
                update(config);
                renderList();
                console.log(localConfig, tags);
            });
        }
    });

}

const favListTpl = `
    <div class="fav-list-item {{isCurrent}}" data-id="{{favId}}">
        <div class="cell idx">{{idx}}</div>
        <div class="cell name">{{name}}</div>
        <div class="cell date">{{date}}</div>
        <div class="cell del" data-id="{{favId}}">删除</div>
    </div>
`;

function renderFavList(list) {
    const listPanel = $('.fav-content-box');
    let html = '';
    list.forEach((item, index) => {
        let date = new Date();
        date.setTime(item.timeStamp);
        html += favListTpl.replace(/\{\{idx\}\}/g, index + 1)
            .replace(/\{\{favId\}\}/g, `${item.favId}`)
            .replace(/\{\{name\}\}/g, `${item.name}`)
            .replace(/\{\{isCurrent\}\}/g, `${item.favId === currentFavId ? 'active' : ''}`)
            .replace(/\{\{date\}\}/g, `${dateFormat('YYYY-MM-DD HH:mm:ss', date)}`)
    });
    listPanel.html(html);
    console.log(list);
    favList = list;
}

$('.fav-panel').on('click', '.fav-list-item .del', function (e) {
    e.stopPropagation();
    const bg = chrome.extension.getBackgroundPage();
    const favId = $(this).data('id');
    const newList = favList.filter(item => item.favId !== favId);
    let newFavId = "";
    favList = newList;
    if (newList[0]) {
        newFavId = newList[0].favId;
    }
    currentFavId = newFavId;
    bg.storageSet(favListKey, newList);
    bg.storageSet(currentFavIdKey, newFavId);
    renderFavList(newList);
    renderList();
});

function initFavList(cb) {
    const bg = chrome.extension.getBackgroundPage();
    bg.storageGet(favListKey, [], function (res) {
        if (res.length === 0) {
            cb && cb();
            return;
        }
        bg.storageGet(currentFavIdKey, "", function (favId) {
            console.log('currentFavId', favId);
            favList = res;
            currentFavId = favId ? favId : favList[0].favId;
            setFavConfigToLocalConfigByFavId(currentFavId);
            renderFavList(res);
            cb && cb();
        });
    });
}

function init() {
    initFavList(function () {
        renderList(function () {
            renderTags();
        });
    });

}

init();