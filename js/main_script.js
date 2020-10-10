const stroageKey = "KinerSwitchHostConfig";
const favListKey = "fav-list";
const currentFavIdKey = "currentFavIdKey";
const KinerSwitchHostGlobalConfig = "KinerSwitchHostGlobalConfig";
let favList = [];
let currentFavId = "";
const tags = new Set();
let colorIdx = 0;
let domainColor = {};
let globalSwitch = false;
let isSelectAll = false;

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

const csvHeader = "别名,域名,ip地址,是否默认打开,标签\n";

const listTpl = `<div class="list-item" data-id="{{id}}" style="background-color: {{bgColor}};">
                <div class="cell checkbox">
                    <div class="checkout-box" data-id="{{id}}"></div>
                </div>
                <div class="cell idx">{{idx}}</div>
                <div class="cell can-edit domain" contenteditable data-key="domain">{{domain}}</div>
                <div class="cell can-edit ip" contenteditable data-key="ip">{{ip}}</div>
                <div class="cell can-edit alias" contenteditable data-key="name">{{name}}</div>
                <div class="cell tags">{{tags}}</div>
                <div class="switch-btn {{display}}" data-id="{{id}}">
                    <div class="bg"></div>
                    <div class="front-btn"></div>
                </div>
                <div class="del-btn" data-id="{{id}}">删除</div>
            </div>`;

const favListTpl = `
    <div class="fav-list-item {{isCurrent}}" data-id="{{favId}}">
        <div class="cell idx">{{idx}}</div>
        <div class="cell name">{{name}}</div>
        <div class="cell date">{{date}}</div>
        <div class="cell del" data-id="{{favId}}">删除</div>
    </div>
`;

const bg = chrome.extension.getBackgroundPage();

const $favPanel = $('.fav-panel');
const $favList = $('.fav-content-box');
const $favMask = $favPanel.find('.mask');

const $menuSaveFav = $('.save-fav');
const $menuInputCsv = $('.input-csv');
const $menuImportFav = $('#favJson');
const $menuImportCsv = $('#configCsv');
const $menuFavConfigList = $('.fav-config');
const $menuExportConfig = $('#export');
const $menuExportFavList = $('#export-fav');

const $tagsPanel = $('.tag-panel');

const $filterInput = $('.filter-input');
const $filterBtn = $('.filter-btn');
const $addBtn = $('.add-btn');
const $inputCsvPanel = $('.config-input');
const $toolsPanel = $('.tools-panel');
const $csvInput = $('#csvInput');
const $addHostPanel = $('.add-host-panel');

const $configList = $('.list');

const $globalSwitch = $('.global-switch');

const $actionSelectAll = $('.select-all');
const $actionReverse = $('.select-reverse');
const $actionSelectOpen = $('.select-open');
const $actionDelSelect = $('.del-select');
const $actionOpenSelected = $('.open-select');
const $actionCloseSelected = $('.close-select');

const $delAllFav = $('.del-all');

const $menuBtn = $('.more-btn-box');
const $favName = $('.fav-name');

/**
 * 程序入口
 */
function init() {
    initData(function () {
        initEvent();
        render();
    });

}

/**
 * 绑定事件
 */
function initEvent() {

    $menuFavConfigList.off('click').click(function () {
        showFavPanel();
    });
    $menuImportFav.off('change').change(function (e) {
        const file = e.target.files[0];
        importJSONFile(file, function () {
            $menuImportFav.val('');
        })
    });
    $menuImportCsv.off('change').change(function (e) {
        const file = e.target.files[0];
        importCsvFile(file, function () {
            $menuImportCsv.val('');
        })
    });
    $menuSaveFav.off('click').on('click',function () {
        const currentConfig = getCurrentConfig();
        saveCurrentConfigAsFav(currentConfig);
    });


    $favMask.off('click').click(function () {
        hideFavPanel();
    });

    $favPanel.off('click').on('click', '.fav-list-item', function () {
        let favId = $(this).data('id');
        updateCurrentFavId(favId);
        hideFavPanel();
    });
    $tagsPanel.off('click').on('click', '.tag', function () {
        const text = $(this).text();
        $filterInput.val(text);
        filter(text);
    });

    $filterInput.off('keydown').on('keydown', function (e) {
        if (e.keyCode === 13) {
            filter($(this).val().trim());
        }
    });
    $filterBtn.off('click').on('click', function () {
        const text = $filterInput.val().trim();
        filter(text);
    });
    $addBtn.off('click').on('click', function () {
        showAddHostPanel();
    });
    $menuInputCsv.off('click').on('click', function () {
        showConfigCsvInputPanel();
    });
    $inputCsvPanel.find('.save-btn').off('click').click(function () {
        const text = $csvInput.val().trim();
        importCsv(text);
        $csvInput.val('');
        hideConfigCsvInputPanel();
    }).end().find('.cancel-btn').off('click').click(function () {
        hideConfigCsvInputPanel();
    });
    $addHostPanel.find('.save-btn').off('click').click(function () {
        doAddHost();
        hideAddHostPanel();
    }).end().find('.cancel-btn').off('click').click(function () {
        hideAddHostPanel();
    });

    $configList.off('click').on('click', '.list-item .checkbox', function () {
        const $checkbox = $(this).find('.checkout-box');
        $checkbox.toggleClass('checked');
    }).on('click', '.list-item .switch-btn', function () {
        const configId = $(this).data('id');
        let currentConfigList = getCurrentConfig();
        const currentConfig = currentConfigList.find(item=>item.id===configId);
        currentConfigList = currentConfigList.map(item=>{
            if(item.domain===currentConfig.domain){
                if(item.id!==configId){
                    return {
                        ...item,
                        isOpen: false
                    }
                }else{
                    return {
                        ...item,
                        isOpen: !item.isOpen
                    }
                }
            }else{
                return item;
            }
        });

        updateFavConfigByFavId(currentFavId, currentConfigList, true);

        init();

    }).on('click', '.del-btn', function () {
        const configId = $(this).data('id');
        const currentConfigList = getCurrentConfig();
        const currentConfigIdx = currentConfigList.findIndex(item=>item.id===configId);
        console.log('待删除元素：', currentConfigList, currentConfigIdx, configId);
        currentConfigList.splice(currentConfigIdx, 1);

        updateFavConfigByFavId(currentFavId, currentConfigList, true);

        init();
    });

    $configList.off('blur').on('blur', '.list-item .can-edit', function () {
        const id = $(this).parents('.list-item').data('id');
        const key = $(this).data('key');
        const text = $(this).text();
        const currentConfigList = getCurrentConfig();
        const oldConfigIdx = currentConfigList.findIndex(item=>item.id===id);
        const oldConfig = currentConfigList[oldConfigIdx];
        oldConfig[key] = text;
        currentConfigList.splice(oldConfigIdx, 1, oldConfig);

        updateFavConfigByFavId(currentFavId, currentConfigList, true);
        init();

    });

    $actionSelectAll.off('click').on('click', function () {
        if(!isSelectAll){
            $configList.find('.list-item .checkout-box').addClass('checked');
        }else{
            $configList.find('.list-item .checkout-box').removeClass('checked');
        }
        isSelectAll = !isSelectAll;
        $(this).find('.checkout-box').toggleClass('checked');
    });

    $actionReverse.off('click').on('click',function () {
        $configList.find('.list-item .checkout-box').each(function (index, item) {
            if($(item).hasClass('checked')){
                $(item).removeClass('checked');
            }else{
                $(item).addClass('checked');
            }
        })
    });

    $actionDelSelect.off('click').on('click', function () {
        const selectedItem = getAllSelectedItem();
        delConfig(selectedItem);
    });

    $actionOpenSelected.off('click').on('click', function () {
        const selectedItem = getAllSelectedItem();
        openOrCloseConfig(selectedItem, true);
    });
    $actionCloseSelected.off('click').on('click', function () {
        const selectedItem = getAllSelectedItem();
        openOrCloseConfig(selectedItem, false);
    });


    $globalSwitch.off('click').click(function () {
        updateGlobalSwitch();
    });

    $delAllFav.off('click').on('click', function () {
        createDefaultFav();
        bg.storageSet(favListKey, favList);
        init();
    });

    $favList.off('click').on('click', '.fav-list-item .del', function () {
        const favId = $(this).data('id');
        const idx = favList.findIndex(item=>item.favId===favId);
        favList.splice(idx, 1);
        bg.storageSet(favListKey, favList);
        init();
    });

    $menuBtn.mouseover(function () {
        preExport();
    });
}

/**
 * 开启或关闭给定配置数组的配置
 * @param configs
 * @param isOpen
 */
function openOrCloseConfig(configs, isOpen){
    const currentConfigList = getCurrentConfig();
    configs.forEach(openItem=>{
        const idx = currentConfigList.findIndex(item=>item.id===openItem.id);
        const cur = currentConfigList.find(item=>item.id===openItem.id);
        cur.isOpen = isOpen;
        currentConfigList.splice(idx, 1, cur);
    });

    updateFavConfigByFavId(currentFavId, currentConfigList, true);

    init();
}

/**
 * 删除给定配置输出的配置
 * @param configs
 */
function delConfig(configs){

    const currentConfigList = getCurrentConfig();
    configs.forEach(delItem=>{
        const idx = currentConfigList.findIndex(item=>item.id===delItem.id);
        currentConfigList.splice(idx, 1);
    });

    updateFavConfigByFavId(currentFavId, currentConfigList, true);

    init();

}

/**
 * 获取所有选中的配置
 * @returns {(*|jQuery|number|bigint|U)[]}
 */
function getAllSelectedItem(){
    const selectedIds = [];
    $configList.find('.list-item .checkout-box.checked').each(function (index, item) {
        selectedIds.push($(item).data("id"));
    });
    const currentConfigList = getCurrentConfig();
    return selectedIds.map(id=>currentConfigList.find(item=>item.id===id));
}

/**
 * 将当前配置保存在偏好设置中
 * @param config
 */
function saveCurrentConfigAsFav(config){
    const uid = createUid();

    const name = window.prompt("请输入偏好配置名称", "");
    if (!name) {
        return;
    }

    favList.push({
        favId: uid,
        name,
        config: config,
        timeStamp: Date.now()
    });

    bg.storageSet(favListKey, favList);
    init();
}

/**
 * 新增host配置
 */
function doAddHost(){
    const form = $('#form').serializeArray();
    const config = parseObj(form);
    config.id = createUid();
    config.tags.split(':').forEach(tag=>!tags.has(tag)&&tags.add(tag));

    if (doValidate(config)) {
        const currentFavConfig = getCurrentConfig();
        currentFavConfig.push(config);
        updateFavConfigByFavId(currentFavId, currentFavConfig, true);
        init();
    }
}

/**
 * 根据条件筛选
 * @param val
 */
function filter(val){
    if(!val){
        renderConfList();
    }else{
        renderConfList(val);
    }
}

/**
 * 显示增加host配置面板
 */
function showAddHostPanel() {
    $tagsPanel.hide();
    $toolsPanel.hide();
    $configList.hide();
    $addHostPanel.show();
}
/**
 * 隐藏增加host配置面板
 */
function hideAddHostPanel() {
    $addHostPanel.hide();
    $tagsPanel.show();
    $toolsPanel.show();
    $configList.show();
}

/**
 * 显示输入csv文本的面板
 */
function showConfigCsvInputPanel(){
    $tagsPanel.hide();
    $toolsPanel.hide();
    $configList.hide();
    $inputCsvPanel.show();
}
/**
 * 隐藏输入csv文本的面板
 */
function hideConfigCsvInputPanel(){
    $tagsPanel.show();
    $toolsPanel.show();
    $configList.show();
    $inputCsvPanel.hide();
}

/**
 * 显示偏好面板
 */
function showFavPanel() {
    $favPanel.show().find('.mask').fadeIn().end().find('.fav-content-box').css({
        transform: `translateX(0)`
    });
}

/**
 * 隐藏偏好面板
 */
function hideFavPanel() {
    $favPanel.find('.mask').fadeOut().end().find('.fav-content-box').css({
        transform: `translateX(100%)`
    });
    setTimeout(() => {
        $favPanel.hide();
    }, 300);
}

/**
 * 创建默认偏好设置
 */
function createDefaultFav() {
    favList = [
        {
            favId: createUid(),
            name: "默认偏好",
            config: [],
            timeStamp: Date.now()
        }
    ]
}

/**
 * 初始化数据
 */
function initData(cb) {
    bg.storageGet([favListKey, currentFavIdKey, KinerSwitchHostGlobalConfig], [], function (res) {
        favList = res[favListKey]||[];
        if(favList.length===0){
            createDefaultFav();
        }
        currentFavId = res[currentFavIdKey]||favList[0].favId;
        globalSwitch = res[KinerSwitchHostGlobalConfig]||false;
        initTags();
        console.log(res, favList, currentFavId);
        cb && cb();
    });
}

/**
 * 更新全局开关
 */
function updateGlobalSwitch(){
    globalSwitch = !globalSwitch;
    bg.storageSet(KinerSwitchHostGlobalConfig, globalSwitch);
    renderGlobalSwitch();
}

/**
 * 渲染页面
 */
function render() {
    renderFavList();
    renderConfList();
    renderTagList();
    renderGlobalSwitch();
}

/**
 * 渲染全局开关
 */
function renderGlobalSwitch() {
    if(globalSwitch){
        $globalSwitch.addClass('active');
    }else{
        $globalSwitch.removeClass('active');
    }
}

/**
 * 渲染偏好列表
 */
function renderFavList() {
    let html = '';

    favList.forEach((fav, idx) => {
        html += updateTpl(favListTpl, {
            isCurrent: fav.favId === currentFavId ? "active" : "",
            favId: fav.favId,
            name: fav.name,
            idx: idx + 1,
            date: dateFormat(fav.timeStamp, "YYYY-MM-DD HH:mm:ss")
        });
    });

    $favList.html(html);

}

/**
 * 渲染host配置列表
 */
function renderConfList(val) {
    let html = '';
    let currentConfigList = getCurrentConfig();
    doProxy(currentConfigList);
    const currentFav = favList.find(item=>item.favId===currentFavId);
    if(currentFav){
        $favName.text(`${currentFav.name}`);
    }
    if(val){
        currentConfigList = currentConfigList.filter(item=>(item.name.includes(val) || item.domain.includes(val) || item.ip.includes(val) || item.tags.includes(val)));
    }
    if(currentConfigList.length===0){
        $configList.addClass('no-record');
    }else{
        $configList.removeClass('no-record');
    }
    currentConfigList.forEach((conf, idx)=>{
        let bgColor = domainColor[conf.domain];
        if(!bgColor){
            bgColor = domainColor[conf.domain] = colors[colorIdx++];
            if (colorIdx === colors.length - 1) {
                colorIdx = 0;
            }
        }

        html += updateTpl(listTpl, {
            id: conf.id,
            idx: idx+1,
            tags: conf.tags.split(':').map(item=>`<span class="tag">${item}</span>`).join(''),
            bgColor: bgColor,
            name: conf.name,
            domain: conf.domain,
            ip: conf.ip,
            display: conf.isOpen ? 'active' : ''
        });
    });

    $configList.html(html);
}

/**
 * 创建uuid
 * @returns {string}
 */
function createUid() {
    return `${parseInt((Math.random() * 9999999999999) + "")}_${Date.now()}`
}


/**
 * 渲染标签面板列表
 */
function renderTagList() {
    let html = '';
    Array.from(tags).forEach(item=>{
        console.log(item);
        html += `<span class="tag">${item}</span>`;
    });
    $tagsPanel.html(html);
}

/**
 * 初始化tag数据
 */
function initTags() {
    if(!favList){
        return;
    }
    favList.forEach(item => {
        const config = item.config;
        config.forEach(conf=>{
            const configTags = (conf.tags || "").split(":");
            configTags.forEach(tag => {
                if (!tags.has(tag)) {
                    tags.add(tag);
                }
            })
        });
    })
}


/**
 * 根据favId更新fav列表
 * @param favId
 * @param config
 * @param isReplace
 */
function updateFavConfigByFavId(favId, config, isReplace = true) {
    const idx = favList.findIndex(item => item.favId === favId);
    const favConfig = getFavConfigByFavId(favId);

    if (isReplace) {
        favConfig.config = config;
    } else {
        favConfig.config = {...favConfig.config, ...config}
    }

    favList.splice(idx, 1, favConfig);

    bg.storageSet(favListKey, favList);

    return favConfig;
}

/**
 * 根据favId获取偏好设置
 * @param favId
 * @returns {*}
 */
function getFavConfigByFavId(favId) {
    return favList.find(item => item.favId === favId);
}

/**
 * 更新当前设置Id
 * @param favId
 * @param config
 */
function updateCurrentFavId(favId, config) {
    currentFavId = favId;
    bg.storageSet(currentFavIdKey, currentFavId);
    if(config){
        updateFavConfigByFavId(favId, config, true);
    }
    render();
}

/**
 * 获取当前配置
 * @returns {*}
 */
function getCurrentConfig(){
    const conf = getFavConfigByFavId(currentFavId);
    if(conf){
        return conf.config;
    }else{
        return [];
    }

}

/**
 * 替换模版插值
 * @param tpl
 * @param params
 * @returns {*}
 */
function updateTpl(tpl, params) {
    let res = tpl;
    Object.keys(params).forEach(key => {
        const reg = new RegExp(`\{\{${key}\}\}`, 'g');
        let value = params[key];

        if (typeof value === "function") {
            value = value(key);
        }

        res = res.replace(reg, value);
    });
    return res;
}

/**
 * 时间格式化
 * @param date
 * @param fmt
 * @returns {*}
 */
function dateFormat(date, fmt) {
    if (!(date instanceof Date)) {
        let tmp = new Date();
        tmp.setTime(date);
        date = tmp;
    }
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
 * 导入csv文本
 * @param csv
 */
function importCsv(csv){
    csv = csv.trim();
    //显示文件内容
    const arr = csv.split("\n").filter(item=>!item.includes(csvHeader.replace(/\n/g,'')));
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

    const currentFavConf = getCurrentConfig();
    currentFavConf.push(...result);
    updateCurrentFavId(currentFavId, currentFavConf);

}

/**
 * 导入json对象
 * @param res
 * @param cb
 * @returns {*}
 */
function importFavJson(res, cb){
    let json = {};
    try{
        json = JSON.parse(res);
    }catch (e) {
        json = {};
    }

    favList = [...favList, ...json];
    bg.storageSet(favListKey, favList, function () {
        init();
        cb && cb();
    });
    return json;
}

/**
 * 导入csv文件
 * @param file
 * @param cb
 */
function importCsvFile(file, cb) {
    getFileContent(file, function (content) {
        importCsv(content);
        cb();
    });
}

/**
 * 导入json文件
 * @param file
 * @param cb
 */
function importJSONFile(file, cb) {
    getFileContent(file, function (content) {
        importFavJson(content);
        cb();
    });
}

/**
 * 从文件中读取文本信息
 * @param file
 * @param cb
 */
function getFileContent(file, cb){
    const reader = new FileReader();
    reader.onload = function () {
        const res = reader.result;
        if (res) {
            cb(res);
        }else{
            alert('文件内容为空');
        }
    };
    reader.readAsText(file);
}

function createCsvText(config) {
    let txt = csvHeader;
    txt+=config.map(item => `${item.name},${item.domain},${item.ip},${item.isOpen},${item.tags}`).join('\n');
    return txt;
}

function preExport(){
    const currentFav = favList.find(item=>item.favId===currentFavId);
    const currentConfig = currentFav.config;
    initDownloadLink($('#export'), `${currentFav.name}_${dateFormat(currentFav.timeStamp, "YYYY-MM-DD HH:mm:ss")}.csv`,'text/csv', createCsvText(currentConfig));
    initDownloadLink($('#exportFav'), '偏好设置列表.json', 'text/json', JSON.stringify(favList, null, 4));
}

/**
 * 生成下载链接
 * @param target
 * @param fileName
 * @param type
 * @param data
 */
function initDownloadLink(target, fileName, type, data){
    data = "\ufeff" + data;
    const blob = new Blob([data], {type: `${type},charset=UTF-8`});
    const url = URL.createObjectURL(blob);
    const link = target;
    link.attr("href", url);
    link.attr("download", fileName);
}

/**
 * 启动代理
 * @param hostList
 */
function doProxy(hostList){
    if(globalSwitch){
        bg.proxy(hostList);
    }else{
        bg.cancelProxy();
    }

}

init();