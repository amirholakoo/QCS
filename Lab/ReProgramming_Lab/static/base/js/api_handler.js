const PAGE_DATA = {};
let currentPage = null;
// let IsProcessingMoreTableData = false;

let PAGE_API = {

    paper_create_form: [

        {
            url: "/paper/paper_type/all/",
            state: null, //"dashboard.rolls",
            callback: DisplayPaperType,
            refresh: 3000,
        },
        {
            url: "/paper/person_name/all/",
            state: null,
            callback: DisplayPersonNames,
            refresh: 3000,
        },
        {
            url: "/material/all/",
            state: null, //"dashboard.rolls",
            callback: DisplayMaterial,
            refresh: 4000,
        },
        {
            url: "/brand/all/",
            state: "brand.all",
            callback: AddBrandsSuggestion,
            refresh: 5000,
        },
        {
            url: "/production/all/",
            state: "production.all",
            callback: DisplayProductionMachine,
            refresh: 5000,
        },
    ],
    paper_dashboard: [
        {
            url: "paper/roll/all?page=1",
            state: null,
            callback: DisplayPaperDashboardRolls,
            refresh: 6000,
        },
    ],
    paper_form_detail: [
        {
            url: "/production/all/",
            state: "production.all",
            callback: DisplayProductionMachine,
            refresh: 5000,
        },
        {
            url: "/paper/person_name/all/",
            state: null,
            callback: DisplayPersonNames,
            refresh: 3000,
        },
        {
            url: "/paper/paper_type/all/",
            state: null, //"dashboard.rolls",
            callback: DisplayPaperType,
            refresh: 3000,
        },
        {
            url: "/brand/all/",
            state: "brand.all",
            callback: AddBrandsSuggestion,
            refresh: 5000,
        },
        {
            url: "/material/all/",
            state: null, //"dashboard.rolls",
            callback: DisplayMaterial,
            refresh: 4000,
        },
        {
            url: `paper/roll/get_roll`,
            state: null,
            callback: RollDetails,
            progress: {
                display: true,
                text: "در حال دریافت اطلاعات کاغذ"
            }
        },
    ]

};

const GLOBAL_API = [

    {
        url: "base/current_date/",
        state: "global.current_date",
        callback: DisplayFormsDate,
    }

];


function GetParamsFromUrl() {
    const hashPart = window.location.hash.split('#').at(-1);

    const query = hashPart?.includes('?')
        ? hashPart.split('?')[1]
        : '';

    const params = new URLSearchParams(query);

    return params;
}


let PAGE_TIMERS = [];

function ClearPageTimers() {

    for (const timer of PAGE_TIMERS) {
        clearTimeout(timer);
    }

    PAGE_TIMERS = [];
}

async function RunPageAPI(config) {

    if (!config.refresh) {
        console.log("runpageapi");
        await APIRequest(config);
        console.log("runpageapi endddddd");
        return;
    }

    const run = async () => {
        console.log("runnnnn");
        if (PAGE_TIMERS.length > 100) {
            PAGE_TIMERS=[]
        }
        await APIRequest(config);

        const timer = setTimeout(
            run,
            config.refresh
        );

        PAGE_TIMERS.push(timer);
    };

    run();
}


function SetPageData(path, value) {
    const keys = path.split(".");
    let target = PAGE_DATA;
    for (let i = 0; i < keys.length - 1; i++) {

        if (
            !target[keys[i]] || typeof target[keys[i]] !== "object") {
            target[keys[i]] = {};
        }
        target = target[keys[i]];
    }
    target[keys[keys.length - 1]] = value;
}

async function APIRequest({
    url,
    method = "GET",
    data = null,
    state = null,
    callback = null,
    callbackParams = null,
    progress=null,
    onError = null
}) {
    let progressElm=null;
    if (progress) {
        if(progress.display) {
            progressElm = AM_alert({
                progress: true,
                text: progress.text??"در حال دریافت اطلاعات..."
            })
        }
    }
    console.log("Sending to url ... ",url)
    try {

        const params = GetParamsFromUrl()

        if ([...params].length > 0) {

            const separator = url.includes('?')
                ? '&'
                : '?';

            url += separator + params.toString();
        }

        const options = {
            method: method,
            headers: {
                "X-Requested-With": "XMLHttpRequest"
            }
        };
        /*
         * if data exist
         */
        if (data) {
            if (data instanceof FormData) {
                options.body = data;
            } else {
                options.headers["Content-Type"] = "application/json";
                options.body = JSON.stringify(data);
            }
        }

        /*
         * Request
         */
        const response = await fetch(url, options);

        /*
         * HTTP Error
         */
        if (!response.ok) {
            let errorData = null;

            try {
                errorData = await response.json();
            } catch (e) {
                // Response JSON نبود
            }

            const error = new Error(
                `HTTP ${response.status}: ${response.statusText}`
            );

            error.status = response.status;
            error.data = errorData;

            throw error;
        }

        /*
         * JSON
         */
        const result = await response.json();

        /*
         * Save Data
         */
        if (state) {
            SetPageData(state, result);
        }

        /*
         * Callback
         */
        if (callback) {
            await callback(result, callbackParams);
        }
        record_list = document.querySelector('.section_page.active .record_list');
        if (IsProcessingMoreTableData) {
            IsProcessingMoreTableData = false;
        }
        return result;

    } catch (error) {
        if (IsProcessingMoreTableData) {
            IsProcessingMoreTableData = false;
        }
        console.error(
            "APIRequest Error:",
            url,
            error
        );
        /*
         * Custom Error Handler
         */
        if (onError) {
            await onError(error);
        } else {

            /*
             * Default Error
             */
            AM_alert({
                display: true,
                status: "danger",
                text: error.data.alert?error.data.alert:"خطا در دریافت اطلاعات",
            });
        }
        return null;
    } finally {
        if (progressElm) {
            progressElm.close();
        }
    }
}

async function LoadPageData(page,params=null) {
    ClearPageTimers();
    const requests = PAGE_API[page];

    if (!requests || !requests.length) {
        return;
    }

    for (const config of requests) {
        RunPageAPI(config);
    }
}

async function LoadGlobalData() {

    if (!GLOBAL_API || !GLOBAL_API.length) {
        return;
    }

    await Promise.all(
        GLOBAL_API.map(config =>
            APIRequest(config)
        )
    );
}

// ============ FORM API FETCH START =============
async function submitForm(form) {

    const data = {};

    for (const field of form.elements) {

        if (!field.name || field.disabled) continue;

        if (field.type === "checkbox") {
            data[field.name] = field.checked;
        }

        else if (field.type === "radio") {
            if (field.checked) {
                data[field.name] = field.value;
            }
        }

        else {
            data[field.name] = field.value;
        }
    }
    const response = await fetch(form.action, {
        method: "POST",

        headers: {
            "Content-Type": "application/json",
            // "X-CSRFToken": getCookie("csrftoken")
        },

        body: JSON.stringify(data)
    });
    const result = await response.json();
    if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status}`);
        AM_alert({status : 'error', text:`خطای ${response.status};`,btns:false,obj:false});
    } else {
        AM_alert({status : result.status, text:`${result.alert}`,btns:false,obj:false});
    }

    return result;
}


document.querySelectorAll("form").forEach(form => {

    form.addEventListener("submit", async function (event) {
        event.preventDefault();

        try {
            for(const x of this.querySelectorAll("[required_input]")) {
                if(!x.value) { 
                    let section_name = document.querySelector(`.flow_sections_title [section_target='${x.parentElement.parentElement.parentElement.id}']`)
                    section_name = !section_name ? "مصرف مواد" : section_name.textContent
                    AM_alert({status : 'error', text:`لطفا مقدار  <strong style='padding:0 4px;'>" ${x.nextElementSibling.textContent} "</strong> در بخش
                        <strong style='padding:0 4px;'>" ${section_name} "</strong>  را وارد کنید`,btns:false,obj:false});
                    
                    return;
                }
            }
            const result = await submitForm(this);
            if(result.status == "success") {
                window.location = this.getAttribute("next");
            }

        } catch (error) {
            console.error(error);
            AM_alert({status : 'error', text:`خطای ${error};`,btns:false,obj:false});
        }

    });

});
// ============ FORM API FETCH END =============