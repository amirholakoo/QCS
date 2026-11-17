function DisplayPaperType(data) {
    const OutputsId = ["Paper_Form_PaperType","Paper_Form_PaperType_Details"]
    
    for (const id of OutputsId) {
        let position = document.getElementById(id);
        data.result.forEach(x => {
            if(!position.querySelector(`[value="${x.id}"]`)) {
                position.insertAdjacentHTML("beforeend",`
                    <option value="${x.id}">${x.Name}</option>
                `)
            }
        })
    };
}


function DisplayPersonNames(data) {
    const OutputsId = ["Paper_Form_PersonName","Paper_Form_PersonName_Details"]
    
    for (const id of OutputsId) {
        let position = document.getElementById(id);
        data.result.forEach(x => {
            if(!position.querySelector(`[value="${x.id}"]`) && (x.first_name || x.last_name)) {
                position.insertAdjacentHTML("beforeend",`
                    <option value="${x.id}">${x.last_name??x.first_name}</option>
                `)
            }
        })
    };
}

let PaperDashboardPage = 1;
let first_id=null;
function DisplayPaperDashboardRolls(data, params) {
    const rolls_place = document.getElementById("PaperDashboardRolls");
    let table = document.getElementById("PaperDashboardRollsTable")

    if (!table) {
        table = document.createElement("table");
        rolls_place.appendChild(table);
        table.id = "PaperDashboardRollsTable";
        table.setAttribute("page",PaperDashboardPage);
        table.insertAdjacentHTML("afterbegin",`
            <thead>
                <tr>
                    <th>ردیف</th>
                    <th>عملیات</th>
                    <th>شماره رول</th>
                    <th>خط تولید</th>
                    <th>تاریخ - زمان</th>
                    <th>شیفت</th>
                    <th>نوع کاغذ</th>
                    <th>عرض کاغذ</th>
                    <th>گرماژ</th>
                    <th>رطوبت</th>
                    <th>خاکستر</th>
                    <th>کاب</th>
                    <th>پروفایل</th>
                    <th>جزئیات پروفایل</th>
                    <th>BURST</th>
                    <th>MD</th>
                    <th>CD</th>
                    <th>CCT</th>
                    <th>RCT</th>
                    <th>پارگی</th>
                    <th>کلندر</th>
                    <th>سرعت</th>
                    <th>رقیق ساز ( 1 - 5 )</th>
                    <th>غلظت ( 1 - 5 )</th>
                    <th>مواد</th>
                    <th>تنظیمات ماشین</th>
                </tr>
            </thead>
            <tbody>
            </tbody>
            `)
    }
    if (data.pagination.total_pages > PaperDashboardPage && IsProcessingMoreTableData) {
        PaperDashboardPage=data.pagination.page+1;
        IsProcessingMoreTableData=false;
    } else {
        IsProcessingMoreTableData=true;
    }
    let tbody = table.querySelector("tbody")
    let detail_count = 0;
    first_id = tbody.children[0]?tbody.children[0].getAttribute("roll_id"):null;
    PAGE_API.paper_dashboard[0].url = `paper/roll/all?page=1&id=${first_id}`;

    data.result.forEach(paper_roll => {
        if(!tbody.querySelector(`tr[roll_id="${paper_roll.id}"]`)) {
            tbody.insertAdjacentHTML(first_id&&first_id<paper_roll.id?"afterbegin":"beforeend",`
                <tr roll_id="${paper_roll.id}" class="${first_id&&first_id<paper_roll.id?'new-row':''}">
                    <td>${first_id&&first_id<paper_roll.id?'1':tbody.children.length+1}</td>
                    <td>
                        <a href="#paper_dashboard#paper_form_detail?roll_id=${paper_roll.id}&mode=v" style="display:block;">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-eye w-4 h-4"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                        </a>
                        <a href="#paper_dashboard#paper_form_detail?roll_id=${paper_roll.id}&mode=e" class="mt-2" style="display:block;">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-square-pen w-4 h-4"><path d="M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.375 2.625a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4Z"></path></svg>
                        </a>
                    </td>
                    <td>${paper_roll.RollNumber}</td>
                    <td>${paper_roll.ProductionMachine__Name}</td>
                    <td> <b>${paper_roll.Date}</b> <br> شروع: ${paper_roll.RollStartTime} - پایان: ${paper_roll.RollEndTime}</td>
                    <td>${paper_roll.Shift}</td>
                    <td>${paper_roll.PaperType__Name}</td>
                    <td><b>${paper_roll.Width??"-"}</b></td>
                    <td>${paper_roll.Grammage??"-"}</td>
                    <td>${paper_roll.Moisture??"-"}</td>
                    <td>${paper_roll.Ash??"-"}</td>
                    <td>${paper_roll.Cobb??"-"}</td>
                    <td>${paper_roll.PaperProfile}</td>
                    <td style="text-align:right;">
                    ${Object.entries(paper_roll.ProfileDetail ?? {})
                        .map(([key, value], index, array) => `
                        <span style="width: 95px;display: block;">
                            <span style="float:right;">${key.replace("Profile_Detail_","")} ${index==0?'( سالن )':(index === array.length - 1?'( دیوار )':'')}:</span>
                            <span style="float: left;"> ${value}</span>
                        </span>
                        `)
                        .join("<br>") ?? "-"}
                    </td>
                    <td>${paper_roll.Burst??"-"}</td>
                    <td>${paper_roll.MD??"-"}</td>
                    <td>${paper_roll.CD??"-"}</td>
                    <td>${paper_roll.CCT1??"-"}</td>
                    <td>${paper_roll.RCT1??"-"}</td>
                    <td style="${paper_roll.BreakCount>0?'background: #ffe8e8 !important;':''}">${paper_roll.BreakCount??"-"}</td>
                    <td>${paper_roll.CalenderApplied
                            ?'<span class="yes">بله</span>'
                            :'<span class="no">خیر</span>'}</td>
                    <td>${paper_roll.MachineSpeed??"-"}</td>
                    <td>
                        <span style="width: 100%;display:flex;justify-content: space-between;border-bottom:1px solid #d7d7d7;padding-bottom:2px;margin-bottom:2px;">
                            <span style="text-align:right">1:</span>
                            <span style="text-align:left">${paper_roll.Diluent1??"-"}</span>
                        </span>
                        <span style="width: 100%;display:flex;justify-content: space-between;border-bottom:1px solid #d7d7d7;padding-bottom:2px;margin-bottom:2px;">
                            <span style="text-align:right">2:</span>
                            <span style="text-align:left">${paper_roll.Diluent2??"-"}</span>
                        </span>
                        <span style="width: 100%;display:flex;justify-content: space-between;border-bottom:1px solid #d7d7d7;padding-bottom:2px;margin-bottom:2px;">
                            <span style="text-align:right">3:</span>
                            <span style="text-align:left">${paper_roll.Diluent3??"-"}</span>
                        </span>
                        <span style="width: 100%;display:flex;justify-content: space-between;border-bottom:1px solid #d7d7d7;padding-bottom:2px;margin-bottom:2px;">
                            <span style="text-align:right">4:</span>
                            <span style="text-align:left">${paper_roll.Diluent4??"-"}</span>
                        </span>
                        <span style="width: 100%;display:flex;justify-content: space-between;border-bottom:1px solid #d7d7d7;padding-bottom:2px;margin-bottom:2px;">
                            <span style="text-align:right">5:</span>
                            <span style="text-align:left">${paper_roll.Diluent5??"-"}</span>
                        </span>
                    </td>
                    <td>
                        <span style="width: 100%;display:flex;justify-content: space-between;border-bottom:1px solid #d7d7d7;padding-bottom:2px;margin-bottom:2px;">
                            <span style="text-align:right">1:</span>
                            <span style="text-align:left">${paper_roll.Density1??"-"}</span>
                        </span>
                        <span style="width: 100%;display:flex;justify-content: space-between;border-bottom:1px solid #d7d7d7;padding-bottom:2px;margin-bottom:2px;">
                            <span style="text-align:right">2:</span>
                            <span style="text-align:left">${paper_roll.Density2??"-"}</span>
                        </span>
                        <span style="width: 100%;display:flex;justify-content: space-between;border-bottom:1px solid #d7d7d7;padding-bottom:2px;margin-bottom:2px;">
                            <span style="text-align:right">3:</span>
                            <span style="text-align:left">${paper_roll.Density3??"-"}</span>
                        </span>
                        <span style="width: 100%;display:flex;justify-content: space-between;border-bottom:1px solid #d7d7d7;padding-bottom:2px;margin-bottom:2px;">
                            <span style="text-align:right">4:</span>
                            <span style="text-align:left">${paper_roll.Density4??"-"}</span>
                        </span>
                        <span style="width: 100%;display:flex;justify-content: space-between;border-bottom:1px solid #d7d7d7;padding-bottom:2px;margin-bottom:2px;">
                            <span style="text-align:right">5:</span>
                            <span style="text-align:left">${paper_roll.Density5??"-"}</span>
                        </span>
                    </td>
                    <td style="">
                    ${paper_roll.MaterialUsage?.length
                        ?paper_roll.MaterialUsage.map(material =>
                                            `
                                            <span style="
                                            width: 260px;display:flex;
                                            justify-content: space-between;
                                            border-bottom:1px solid #d7d7d7;
                                            padding-bottom:2px;
                                            margin-bottom:2px;
                                            ">
                                                <span style="text-align:right">
                                                ${material.Material__Name}:<br>
                                                محلول در آب
                                                </span>
                                                <span style="text-align:left">
                                                ${material.Value}<br>
                                                ${material.DissolvedAmount}
                                                </span>
                                            </span>
                                            `
                                        ).join("")
                            :'<div class="alert alert-secondary text-center" role="alert">برای این محصول موادی انتخاب نشده است.</div>'}
                    </td>
                    <td>
                        <span style="width: 260px;display:flex;justify-content: space-between;border-bottom:1px solid #d7d7d7;padding-bottom:6px;margin-bottom:6px;">
                            <span style="text-align:right">شیر خمیر هدباکس پایین:</span>
                            <span style="text-align:left">${paper_roll.LowerHeadboxStockValve??"-"}</span>
                        </span>
                        <span style="width: 260px;display:flex;justify-content: space-between;border-bottom:1px solid #d7d7d7;padding-bottom:6px;margin-bottom:6px;">
                            <span style="text-align:right">شیر خمیر هدباکس بالا:</span>
                            <span style="text-align:left">${paper_roll.UpperHeadboxStockValve??"-"}</span>
                        </span>
                        <span style="width: 260px;display:flex;justify-content: space-between;border-bottom:1px solid #d7d7d7;padding-bottom:6px;margin-bottom:6px;">
                            <span style="text-align:right">دمای اصلی خشک کن 1 و 2:</span>
                            <span style="text-align:left">${paper_roll.MainDryer3Temp??"-"}</span>
                        </span>
                        <span style="width: 260px;display:flex;justify-content: space-between;border-bottom:1px solid #d7d7d7;padding-bottom:6px;margin-bottom:6px;">
                            <span style="text-align:right">دمای اصلی خشک کن 3:</span>
                            <span style="text-align:left">${paper_roll.MainDryer3Temp??"-"}</span>
                        </span>
                        <span style="width: 260px;display:flex;justify-content: space-between;border-bottom:1px solid #d7d7d7;padding-bottom:6px;margin-bottom:6px;">
                            <span style="text-align:right">دمای کاغذ قبل از ورود به سایز پرس:</span>
                            <span style="text-align:left">${paper_roll.PaperTempBeforeSizePress??"-"}</span>
                        </span>
                        <span style="width: 260px;display:flex;justify-content: space-between;border-bottom:1px solid #d7d7d7;padding-bottom:6px;margin-bottom:6px;">
                            <span style="text-align:right">دمای نشساسته قبل از ورود به سایز پرس:</span>
                            <span style="text-align:left">${paper_roll.StarchTempBeforeSizePress??"-"}</span>
                        </span>
                        <span style="width: 260px;display:flex;justify-content: space-between;border-bottom:1px solid #d7d7d7;padding-bottom:6px;margin-bottom:6px;">
                            <span style="text-align:right">دمای کاغذ قبل از ورود به خشک کن سه:</span>
                            <span style="text-align:left">${paper_roll.PaperTempBeforeDryer3??"-"}</span>
                        </span>
                        <span style="width: 260px;display:flex;justify-content: space-between;border-bottom:1px solid #d7d7d7;padding-bottom:6px;margin-bottom:6px;">
                            <span style="text-align:right">دمای سیلندر اول خشک کن 3:</span>
                            <span style="text-align:left">${paper_roll.Dryer3FirstCylinderTemp??"-"}</span>
                        </span>
                        <span style="width: 260px;display:flex;justify-content: space-between;border-bottom:1px solid #d7d7d7;padding-bottom:6px;margin-bottom:6px;">
                            <span style="text-align:right">دمای کاغذ قبل از پوپ ریل:</span>
                            <span style="text-align:left">${paper_roll.PaperTempBeforePopeReel??"-"}</span>
                        </span>
                    </td>
                </tr>
                `);


            if (first_id && first_id < paper_roll.id) {
                Array.from(tbody.children).forEach((tr, index) => {
                    tr.children[0].textContent = index + 1;
                });
                AM_alert({status : "info", text:`مشخصات کاغذ جدید توسط یک کاربر دیگر اضافه شد`,btns:false,obj:false});
            }
        }
    })
}



// display roll details ( edit / view roll)

function RollDetails(data) {
    const mode = GetParamsFromUrl().get("mode");
    let submit_btn = document.querySelector("#paper_form_detail form [type='submit']");
    console.log(mode);
    let page_title = document.querySelector(".section_page.active .page_title h5");
    page_title.textContent = `${mode=="v"?"مشاهده":"ویرایش"} کاغذ شماره "${data.result.RollNumber}"`
    let all_related_input = document.querySelectorAll(".section_page.active input, .section_page.active select, .section_page.active textarea");
    all_related_input.forEach(input => {
        if (mode=="v") {
            submit_btn.style.display = "none";
            input.style.pointerEvents = "none";
        } else {
            input.style.pointerEvents = "";
            submit_btn.style.display = "";
        }
        let data_name = input.name.replace("Paper_Form_","")
        let real_data = data.result[data_name] ?? data.result[`${data_name}_id`];

        if (real_data === undefined || real_data === null) {
            if (data.result.ProfileDetail) {
                real_data = data.result.ProfileDetail[data_name];
            }
            if (real_data === undefined || real_data === null) {
                return;
            }
        }

        if (input.type === "checkbox") {
            input.checked = real_data;
        } else {
            input.value = real_data;
        }
    });

    if (data.result.MaterialUsage) {

        for (const material of data.result.MaterialUsage) {

            const id = material.Material;
            const fields = {
                Object: material.Active,
                Value: material.Value,
                Dissolved_Amount: material.DissolvedAmount,
                Brand: material.Brand_id,
                Desc: material.Desc
            };

            for (const [name, value] of Object.entries(fields)) {

                const input = document.querySelector(`.section_page.active [name="Material_Form_${name}_${id}"]`);
                
                if (!input) {
                    continue;
                }

                if (input.type === "checkbox") {
                    input.checked = Boolean(value);
                } else {
                    console.log(input,value);
                    input.value = value ?? "";
                }
            }
        }
    }

    return;
}