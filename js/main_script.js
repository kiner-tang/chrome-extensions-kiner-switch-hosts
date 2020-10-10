const stroageKey = "KinerSwitchHostConfig";
const favListKey = "fav-list";
const currentFavIdKey = "currentFavIdKey";
let favList = [];
let currentFavId = "";
const tags = new Set();
let colorIdx = 0;
let domainColor = {};

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

const listTpl = `<div class="list-item" data-uid="{{uid}}" style="background-color: {{bgColor}};">
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

const favListTpl = `
    <div class="fav-list-item {{isCurrent}}" data-id="{{favId}}">
        <div class="cell idx">{{idx}}</div>
        <div class="cell name">{{name}}</div>
        <div class="cell date">{{date}}</div>
        <div class="cell del" data-id="{{favId}}">删除</div>
    </div>
`;

const bg = chrome.extension.getBackgroundPage();

const $favList = $('.fav-content-box');
const $favDelAllBtn = $('.del-all');

const $menuSaveFav = $('.save-fav');

/**
 * 程序入口
 */
function init(){
    initData(function () {
        initEvent();
        render();
    });

}

/**
 * 绑定事件
 */
function initEvent(){

}

/**
 * 初始化数据
 */
function initData(cb){
    bg.storageGet([stroageKey, favListKey, currentFavIdKey], [],function (res) {
        favList = res[favListKey];
        currentFavId = res[currentFavIdKey];
        initTags();
        console.log(res, favList, currentFavId);
        cb && cb();
    });
}

/**
 * 渲染页面
 */
function render(){
    renderFavList();
    renderConfList();
    renderTagList();
}

/**
 * 渲染偏好列表
 */
function renderFavList(){
    let html = '';

    favList.forEach((fav, idx) => {
        html += updateTpl(favListTpl, {
            isCurrent: fav.favId===currentFavId,
            favId: fav.favId,
            name: fav.name,
            idx: idx+1,
            date: dateFormat(fav.date, "YYYY-MM-DD HH:mm:ss")
        });
    });

    $favList.html(html);

}

/**
 * 渲染host配置列表
 */
function renderConfList(){

}

/**
 * 渲染标签面板列表
 */
function renderTagList(){

}

/**
 * 初始化tag数据
 */
function initTags(){
    favList.forEach(item=>{
        const config = item.config;
        const configTags = (config.tags||"").split(":");
        configTags.forEach(tag=>{
            if(!tags.has(tag)){
                tags.add(tag);
            }
        })
    })
}


/**
 * 根据favId更新fav列表
 * @param favId
 */
function updateFavConfigByFavId(favId, config, isReplace=true){
    const idx = favList.findIndex(item=>item.favId===favId);
    const favConfig = getFavConfigByFavId(favId);

    if(isReplace){
        favConfig.config = config;
    }else{
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
function getFavConfigByFavId(favId){
    return favList.find(item=>item.favId===favId);
}

/**
 * 替换模版插值
 * @param tpl
 * @param params
 * @returns {*}
 */
function updateTpl(tpl, params){
    let res = tpl;
    Object.keys(params).forEach(key=>{
        const reg = new RegExp(`\{\{${key}\}\}`, 'g');
        let value = params[key];

        if(typeof value === "function"){
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
    if(!(date instanceof Date)){
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

init();