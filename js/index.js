
const stroageKey = "KinerSwitchHostConfig";
let localConfig;



const tpl = `<div class="list-item" data-idx="{{idx}}" data-uid="{{uid}}">
                <div class="cell checkbox">
                    <div class="checkout-box"></div>
                </div>
                <div class="cell idx">{{idx}}</div>
                <div class="cell can-edit domain" data-key="domain">{{domain}}</div>
                <div class="cell can-edit ip" data-key="ip">{{ip}}</div>
                <div class="cell can-edit alias" data-key="name">{{name}}</div>
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

$('.save-btn').click(function () {
    addHost();

    $('.add-host-panel').hide();
    $('.list').show();
});

$('.cancel-btn').click(function () {
    $('.add-host-panel').hide();
    $('.list').show();
    $('.tools-panel').show();
});

$('.add-btn').click(function () {
    $('.list').hide();
    $('.add-host-panel').show();
    $('.tools-panel').hide();
});

$('body').on('click', '.list-item .del-btn', function () {
    const uid = $(this).parents('.list-item').data('uid');
    const idx = localConfig.findIndex(item=>item.id===uid);
    del(idx);
}).on('click','.list-item .can-edit', function () {
    $(this).attr('contenteditable', true);
}).on('blur','.list-item .can-edit', function () {
    const uid = $(this).parents('.list-item').data('uid');
    const newVal = $(this).html();
    const key = $(this).data('key');
    const bg = chrome.extension.getBackgroundPage();

    const old = localConfig.find(item=>item.id===uid);
    const oldIdx = localConfig.findIndex(item=>item.id===uid);

    const newItem = {...old, [key]: newVal};
    // alert(JSON.stringify(newItem));

    bg.removeIdx(oldIdx, newItem);
    renderList();

}).on('click', '.list .switch-btn', function () {
    const uid = $(this).parents('.list-item').data('uid');
    const old = localConfig.find(item=>item.id===uid);
    // const bg = chrome.extension.getBackgroundPage();
    // const newItem = {...old, isOpen: !old.isOpen};
    const newArr = localConfig.map((item,index) => {

        if(item.domain===old.domain){
            if(item.id===uid){
                return {
                    ...item,
                    isOpen: !item.isOpen
                };
            }else{
                return {
                    ...item,
                    isOpen: false
                };
            }
        }else{
            return item
        }
    });

    update(newArr, true);
}).on('click', '.list-item .checkout-box', function () {
    $(this).toggleClass('checked');
});

$('#file').change(function (e) {
    const files = e.target.files;
    importCsv(files[0], function () {
        $('#file').val('');
    });
});


$('.filter-btn').click(function () {
    filter($('.filter-input').val().trim())
});

$('.filter-input').on('keydown', e=>{
    if(e.keyCode === 13){
        filter($('.filter-input').val().trim());
    }
});

let isSelectedAll = false;

$('.select-all').click(function () {
    if(isSelectedAll){
        $('.list-item .checkout-box').removeClass('checked');
        $('.select-all .checkout-box').removeClass('checked');
    }else{
        $('.list-item .checkout-box').addClass('checked');
        $('.select-all .checkout-box').addClass('checked');
    }
    isSelectedAll = !isSelectedAll
});

$('.select-reverse').click(function () {
    let checkoutbox = $('.list-item .checkout-box');
    checkoutbox.each(function (index, item) {
        if($(item).hasClass('checked')){
            $(item).removeClass('checked');
        }else{
            $(item).addClass('checked');
        }
    });
});
$('.select-open').click(function () {
    let checkoutbox = $('.list-item .checkout-box');
    checkoutbox.each(function (index, item) {
        let idx = $(this).parents('.list-item').data('idx');
        if(localConfig[idx-1].isOpen){
            $(item).addClass('checked');
        }else{
            $(item).removeClass('checked');
        }
    });
});

$('.del-select').click(function () {
    const selectItem = getSelectItem();
    const bg = chrome.extension.getBackgroundPage();
    const idxs = selectItem.map(item=>item.idx);
    bg.removeIdxs(idxs);
    renderList();
    resetToolsPanel();
});
$('.open-select').click(function () {
    const selectItem = getSelectItem();
    const bg = chrome.extension.getBackgroundPage();
    $.each(selectItem, function (index, item) {
        const old = localConfig[item.idx-1];

        const newItem = {...old, isOpen: true};
        bg.removeIdx(item.idx-1, newItem);
    });
    renderList();
    resetToolsPanel();
});
$('.close-select').click(function () {
    const selectItem = getSelectItem();
    const bg = chrome.extension.getBackgroundPage();
    $.each(selectItem, function (index, item) {
        const old = localConfig[item.idx-1];

        const newItem = {...old, isOpen: false};
        bg.removeIdx(item.idx-1, newItem);
    });
    renderList();
    resetToolsPanel();
});
function resetToolsPanel(){
    $('.select-all .checkout-box').removeClass('checked');
    isSelectedAll = false;
}

function getSelectItem(){
    let res = [];
    $('.list-item').each(function (index, item) {
        if($(item).find('.checkout-box.checked').length!==0){
            const idx = $(item).data('idx');
            res.push({
                idx: idx-1,
                data: localConfig[idx-1]
            })
        }
    });

    return res;
}

/**
 * 导入csv数据
 * @param file
 */
function importCsv(file, cb){
    const reader = new FileReader();
    reader.onload = function() {
        const res = reader.result;
        if(res) {
            //显示文件内容
            const arr = res.split("\n").slice(1);
            const result = arr.map(item=>{
                const vals = item.split(',');
                return {
                    id: createUid(),
                    name: vals[0],
                    domain: vals[1],
                    ip: vals[2],
                    isOpen: vals[3].toLowerCase()==="true",
                };
            });
            console.log(result);
            update(result);
            cb&&cb();
        }
    };
    reader.readAsText(file);
}

/**
 * 删除指定索引的数据
 * @param idx 从1开始的索引
 */
function del(idx){
    const bg = chrome.extension.getBackgroundPage();
    bg.removeIdx(idx-1);
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
function renderList(){
    const bg = chrome.extension.getBackgroundPage();
    const val = $('.filter-input').val().trim();

    if(val){
        filter(val);
    }else{
        bg.getGlobalSwitch(globalRes=>{
            // console.log(globalRes);
            if(globalRes.KinerSwitchHostGlobalConfig){
                $('.global-switch').addClass('active');
            }
            bg.getConfig(res=>{
                localConfig = (res||{})[stroageKey]||[];
                bg.updateConfig();
                // 监听消息
                chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {

                    sendResponse({
                        list: localConfig,
                        isOpen: globalRes.KinerSwitchHostGlobalConfig
                    });
                });
                render(localConfig);
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
    if(arr.length===0){
        $('.list').addClass('no-record');
    }else{
        $('.list').removeClass('no-record');
    }
    arr.forEach((item, idx) => {
        html+=tpl.replace(/\{\{idx\}\}/g, `${idx+1}`)
            .replace(/\{\{uid\}\}/g,item.id)
            .replace(/\{\{name\}\}/g,item.name)
            .replace(/\{\{domain\}\}/g,item.domain)
            .replace(/\{\{ip\}\}/g,item.ip)
            .replace(/\{\{display\}\}/g,item.isOpen?'active':'');
    });

    $('.list').html(html);
}

renderList();

/**
 * 更新界面
 * @param config
 * @param isReplace
 */
function update(config, isReplace=false){
    const bg = chrome.extension.getBackgroundPage();
    bg.saveConfig(config, isReplace);

    renderList();
}

/**
 * 对列表数据进行筛选
 * @param val
 */
function filter(val){
    if(!val){
        renderList();
    }
    const bg = chrome.extension.getBackgroundPage();
    bg.getConfig(res=>{

        localConfig = (res||{})[stroageKey]||[];

        let arr = localConfig.filter(item=>{
            return item.name.includes(val)||item.domain.includes(val)||item.ip.includes(val);
        });

        render(arr);

    });

}

function createUid(){
    return `${parseInt((Math.random()*9999999999999)+"")}_${Date.now()}`
}

/**
 * 新增host
 */
function addHost() {
    // console.log('test');
    const bg = chrome.extension.getBackgroundPage();

    bg.getConfig(res=>{
        localConfig = (res||{})[stroageKey]||[];
        // console.log(localConfig);
        const form = $('#form').serializeArray();
        const config = parseObj(form);
        config.id = createUid();


        if (doValidate(config)) {

            update(config);

        }
    });

}
