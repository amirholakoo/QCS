let navs = document.querySelectorAll('.nav_item, .nav_link');
let pages = document.getElementsByClassName('section_page');
let Is_Hash = false;
let Step_1 = false;
let record_list = null;

if (history.pushState) {
    hashchanged();
}

window.addEventListener("hashchange", function () {
    hashchanged();
});

async function hashchanged() {
    Is_Hash=false;
    UrlHsh = document.location.hash;
    resetpage();
    if (UrlHsh) {
        let hash_words = UrlHsh.split('#');
        
        hash_words.shift();
        for (let i=0;i < hash_words.length;i++) {
            SetPage(hash_words[i].replace(/\?.*$/, ''));
            SetSectionsFormFlow();
        }
        await LoadPageData(hash_words[hash_words.length-1].replace(/\?.*$/, ''));
    } else {
        SetPage("dashboard");
    }
}

function resetpage() {
    navs = document.querySelectorAll('.nav_item, .nav_link');
    pages = document.getElementsByClassName('section_page');
    for (let i = 0; i < navs.length; i++) {
        try {
            navs[i].classList.remove('active');
            pages[i].classList.remove('active');
        } catch (error) {

        }
    }
}

async  function SetPage(id) {
    let nav_item = document.querySelector(`[nav_id=${id}]`)
    let page = document.getElementById(id)

    if (nav_item || page) {
        if(nav_item) {nav_item.classList.add('active')};
        if(page) {page.classList.add('active')};
    } else {
        AM_alert({display:true,status: 'warning', text:"این صفحه وجود ندارد"})
        // window.location = "#nav_home";
        return;
    }

    currentPage = id;
    await LoadGlobalData();
    // =========== record list view show more on scroll start =======

    record_list = document.querySelector('.section_page.active .record_list');
    if (record_list) {
        DisplayMoreOnScroll()
    }
    // =========== record list view show more on scroll end =======
    
    if(id == "setting") {
        setTimeout(SetSettingsNav, 100);
    }
}


function SetSettingsNav() {
    const hash = document.location.hash;
    let setting_navs = document.querySelectorAll(".section_page.active .setting_nav a");
    for ( const x of setting_navs) {
        x.classList.remove("active")
    }
    if(setting_navs.length > 1) {
        if (hash.toLowerCase().includes("paper_type")) {setting_navs[3].classList.add("active")}
        else if(hash.toLowerCase().includes("production")) {setting_navs[2].classList.add("active")}
        else if(hash.toLowerCase().includes("brand_dashboard")) {setting_navs[1].classList.add("active")}
        else {setting_navs[0].classList.add("active")}
    }
}